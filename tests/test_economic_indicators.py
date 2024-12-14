from botasaurus.browser import browser, Driver
from datetime import datetime
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@browser(
    block_images=True,  # Speed up loading
    reuse_driver=True,  # Reuse browser instance
    close_on_crash=True,  # Continue on errors
    max_retry=3  # Retry failed requests
)
def scrape_economic_indicators(driver: Driver, data):
    try:
        # Visit the page with Google referrer to avoid bot detection
        driver.google_get("https://tradingeconomics.com/united-states/indicators")
        
        # Wait for content to load
        driver.wait_for_selector('#aspnetForm')
        
        # Extract indicators
        indicators = {}
        rows = driver.select_all('table#calendar tbody tr')
        
        for row in rows:
            try:
                name = driver.get_text('td:nth-child(2)', element=row)
                value = driver.get_text('td:nth-child(3)', element=row)
                previous = driver.get_text('td:nth-child(4)', element=row)
                
                indicators[name] = {
                    'current': value,
                    'previous': previous
                }
            except Exception as e:
                print(f"Error parsing row: {e}")
                continue
                
        # Add timestamp
        result = {
            'timestamp': datetime.now().isoformat(),
            'indicators': indicators
        }
        
        return result

    except Exception as e:
        print(f"Error occurred: {e}")
        return None

if __name__ == "__main__":
    result = scrape_economic_indicators()
    if result:
        print("\nLatest scrape result:")
        print(json.dumps(result, indent=2)) 