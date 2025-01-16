import logging
from bs4 import BeautifulSoup
import requests
from typing import Dict, Any, Optional
from urllib.parse import urljoin

logger = logging.getLogger('application_flow')

class LeverNavigator:
    def __init__(self):
        self.session = requests.Session()
        
    def get_job_details(self, job_url: str) -> Dict[str, Any]:
        """Get job details from the main job posting page"""
        try:
            response = self.session.get(job_url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            job_details = {
                'title': self._get_text(soup, '.posting-headline h2'),
                'company': self._get_text(soup, '.posting-headline h3'),
                'location': self._get_text(soup, '.location'),
                'description': self._get_text(soup, '.description'),
                'requirements': self._extract_requirements(soup),
                'apply_url': self._get_apply_url(job_url, soup),
                'department': self._get_text(soup, '.department'),
                'commitment': self._get_text(soup, '.commitment'),
                'workplaceType': self._get_text(soup, '.workplaceTypes')
            }
            
            logger.info(
                "Job details extracted",
                extra={'structured_data': {'job_details': job_details}}
            )
            
            return job_details
            
        except Exception as e:
            logger.error(f"Error getting job details: {e}")
            raise
    
    def _get_apply_url(self, job_url: str, soup: BeautifulSoup) -> str:
        """Get the application URL from the job page"""
        try:
            # Try finding the apply button
            apply_button = soup.select_one('a.posting-btn-submit, a[href*="apply"]')
            if apply_button and apply_button.get('href'):
                return urljoin(job_url, apply_button['href'])
            
            # Fallback: Construct apply URL
            if not job_url.endswith('/apply'):
                return f"{job_url}/apply"
                
            return job_url
            
        except Exception as e:
            logger.error(f"Error getting apply URL: {e}")
            return f"{job_url}/apply"
    
    def _extract_requirements(self, soup: BeautifulSoup) -> list:
        """Extract job requirements from the posting"""
        requirements = []
        
        # Look for common requirement sections
        requirement_sections = soup.select('.requirements, .content-requirements, .posting-requirements')
        for section in requirement_sections:
            # Extract list items
            req_items = section.select('li')
            requirements.extend([item.get_text(strip=True) for item in req_items])
            
            # Extract paragraphs if no list items
            if not req_items:
                req_paras = section.select('p')
                requirements.extend([para.get_text(strip=True) for para in req_paras])
        
        return requirements
    
    def _get_text(self, soup: BeautifulSoup, selector: str) -> str:
        """Safely extract text from an element"""
        element = soup.select_one(selector)
        return element.get_text(strip=True) if element else "" 