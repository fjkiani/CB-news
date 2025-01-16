import random
import time
from pathlib import Path
import logging
from typing import Optional
import requests

logger = logging.getLogger('application_flow')

class AntiBotHandler:
    def __init__(self, config: dict):
        self.config = config
        self.behavior_settings = config.get('behavior_settings', {})
        self.browser_settings = config.get('browser_settings', {})
        
    def setup_browser_context(self, browser):
        """Setup browser context with anti-bot measures"""
        return browser.new_context(
            viewport={
                'width': self.browser_settings.get('viewport_width', 1920),
                'height': self.browser_settings.get('viewport_height', 1080)
            },
            user_agent=self.browser_settings.get('user_agent'),
            locale=self.browser_settings.get('locale', 'en-US'),
            timezone_id=self.browser_settings.get('timezone', 'America/New_York'),
            proxy=self._get_proxy() if self.config.get('use_proxy') else None
        )
    
    def add_human_behavior(self, page):
        """Add random human-like behaviors"""
        try:
            # Random mouse movements
            if self.behavior_settings.get('mouse_movements'):
                self._simulate_mouse_movement(page)
            
            # Natural scrolling
            if self.behavior_settings.get('scroll_behavior'):
                self._simulate_scrolling(page)
            
            # Random delay
            self._add_random_delay()
            
        except Exception as e:
            logger.warning(f"Error adding human behavior: {e}")
    
    def handle_captcha(self, page) -> bool:
        """Handle CAPTCHA detection and solving"""
        try:
            captcha_selectors = {
                'hcaptcha': [
                    "iframe[title*='checkbox']",
                    "#h-captcha",
                    ".h-captcha",
                    "iframe[src*='hcaptcha']"
                ],
                'recaptcha': [
                    "iframe[src*='recaptcha']",
                    ".g-recaptcha",
                    "#recaptcha"
                ]
            }
            
            for captcha_type, selectors in captcha_selectors.items():
                for selector in selectors:
                    if page.locator(selector).count() > 0:
                        logger.info(f"{captcha_type.upper()} detected")
                        return self._handle_manual_captcha(page)
            
            return False
            
        except Exception as e:
            logger.error(f"Error handling CAPTCHA: {e}")
            return False
    
    def _handle_manual_captcha(self, page) -> bool:
        """Handle CAPTCHA with manual intervention"""
        try:
            logger.info("Waiting for manual CAPTCHA solution...")
            
            # Take screenshot of CAPTCHA
            page.screenshot(path="captcha.png")
            
            # Prompt for manual intervention
            input("Please solve the CAPTCHA manually and press Enter to continue...")
            
            # Wait for validation
            page.wait_for_timeout(2000)
            
            # Verify CAPTCHA is solved
            if page.locator("iframe[src*='captcha']").count() > 0:
                logger.warning("CAPTCHA might not be solved - please verify")
                return False
                
            logger.info("CAPTCHA solved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error in manual CAPTCHA handling: {e}")
            return False
    
    def _simulate_mouse_movement(self, page):
        """Simulate natural mouse movements"""
        try:
            # Random start position
            start_x = random.randint(0, self.browser_settings.get('viewport_width', 1920))
            start_y = random.randint(0, self.browser_settings.get('viewport_height', 1080))
            
            # Move mouse in natural curve
            steps = random.randint(5, 10)
            for _ in range(steps):
                x = start_x + random.randint(-100, 100)
                y = start_y + random.randint(-100, 100)
                page.mouse.move(x, y)
                page.wait_for_timeout(random.randint(50, 200))
                
        except Exception as e:
            logger.debug(f"Mouse movement error: {e}")
    
    def _simulate_scrolling(self, page):
        """Simulate natural scrolling behavior"""
        try:
            # Random scroll positions
            scroll_steps = random.randint(3, 7)
            for _ in range(scroll_steps):
                scroll_amount = random.randint(100, 500)
                page.mouse.wheel(0, scroll_amount)
                page.wait_for_timeout(random.randint(300, 800))
                
        except Exception as e:
            logger.debug(f"Scrolling error: {e}")
    
    def _add_random_delay(self):
        """Add random delay between actions"""
        min_delay = self.behavior_settings.get('min_delay', 500)
        max_delay = self.behavior_settings.get('max_delay', 2000)
        time.sleep(random.uniform(min_delay/1000, max_delay/1000))
    
    def _get_proxy(self) -> Optional[dict]:
        """Get proxy configuration if enabled"""
        try:
            if proxy_url := self.config.get('proxy_url'):
                return {
                    'server': proxy_url,
                    'username': self.config.get('proxy_username'),
                    'password': self.config.get('proxy_password')
                }
        except Exception as e:
            logger.error(f"Error setting up proxy: {e}")
        return None 