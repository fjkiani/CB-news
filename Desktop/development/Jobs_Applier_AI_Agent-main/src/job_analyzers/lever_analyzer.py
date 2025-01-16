import logging
from bs4 import BeautifulSoup
import requests
import json
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger('application_flow')

class LeverJobAnalyzer:
    def __init__(self, resume_path: Path):
        self.resume = self._load_resume(resume_path)
        
    def analyze_job(self, job_url: str) -> Dict[str, Any]:
        """Analyze a Lever job posting"""
        try:
            # Get job page content
            response = requests.get(job_url)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract job details
            job_info = {
                'title': self._get_text(soup, '.posting-headline h2'),
                'company': self._get_text(soup, '.posting-headline h3'),
                'location': self._get_text(soup, '.location'),
                'description': self._get_text(soup, '.description'),
                'requirements': self._extract_requirements(soup),
                'apply_url': self._get_apply_url(job_url),
                'department': self._get_text(soup, '.department'),
                'commitment': self._get_text(soup, '.commitment')
            }
            
            # Analyze match with resume
            job_info['analysis'] = self._analyze_job_match(job_info)
            
            return job_info
            
        except Exception as e:
            logger.error(f"Error analyzing job: {e}")
            raise
    
    def generate_cover_letter(self, job_info: Dict[str, Any]) -> str:
        """Generate customized cover letter based on job analysis"""
        try:
            # Get relevant experience from resume
            relevant_experience = self._get_relevant_experience(job_info)
            
            # Get matching skills
            matching_skills = job_info['analysis']['matching_skills']
            
            # Generate cover letter
            cover_letter = f"""Dear Hiring Manager,

I am writing to express my strong interest in the {job_info['title']} position at {job_info['company']}. With my background in {', '.join(matching_skills[:3])}, I am confident in my ability to contribute effectively to your team.

{self._generate_experience_paragraph(relevant_experience)}

{self._generate_skills_paragraph(job_info)}

{self._generate_closing_paragraph(job_info)}

Best regards,
{self.resume['personal_information']['name']}"""

            return cover_letter
            
        except Exception as e:
            logger.error(f"Error generating cover letter: {e}")
            raise
    
    def _load_resume(self, resume_path: Path) -> Dict[str, Any]:
        """Load and parse resume JSON"""
        try:
            with open(resume_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading resume: {e}")
            raise
    
    def _analyze_job_match(self, job_info: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze how well the resume matches the job"""
        analysis = {
            'matching_skills': self._find_matching_skills(job_info),
            'relevant_experience': self._get_relevant_experience(job_info),
            'match_score': 0,
            'missing_requirements': []
        }
        
        # Calculate match score
        total_reqs = len(job_info['requirements'])
        matching_reqs = len(analysis['matching_skills'])
        analysis['match_score'] = (matching_reqs / total_reqs) * 100 if total_reqs > 0 else 0
        
        # Find missing requirements
        analysis['missing_requirements'] = self._find_missing_requirements(job_info)
        
        return analysis
    
    def _find_matching_skills(self, job_info: Dict[str, Any]) -> list:
        """Find skills from resume that match job requirements"""
        resume_skills = set()
        for skill_type in self.resume.get('skills', {}).values():
            if isinstance(skill_type, list):
                resume_skills.update(skill.lower() for skill in skill_type)
        
        matching = []
        for req in job_info['requirements']:
            req_lower = req.lower()
            for skill in resume_skills:
                if skill in req_lower:
                    matching.append(skill)
        
        return list(set(matching))
    
    def _get_relevant_experience(self, job_info: Dict[str, Any]) -> list:
        """Find relevant experience from resume"""
        relevant = []
        job_keywords = set(self._extract_keywords(job_info['description']))
        
        for exp in self.resume.get('experience', []):
            exp_keywords = set(self._extract_keywords(exp.get('description', '')))
            if job_keywords & exp_keywords:  # If there's keyword overlap
                relevant.append(exp)
                
        return sorted(relevant, key=lambda x: x.get('relevance', 0), reverse=True)
    
    def _generate_experience_paragraph(self, relevant_experience: list) -> str:
        """Generate paragraph about relevant experience"""
        if not relevant_experience:
            return ""
            
        exp = relevant_experience[0]  # Most relevant experience
        return f"""In my role as {exp['title']} at {exp['company']}, I have demonstrated expertise in {exp['key_achievement']}. This experience has prepared me well for the challenges and opportunities at {job_info['company']}."""
    
    def _generate_skills_paragraph(self, job_info: Dict[str, Any]) -> str:
        """Generate paragraph about matching skills"""
        matching_skills = job_info['analysis']['matching_skills']
        if not matching_skills:
            return ""
            
        return f"""I bring strong technical skills in {', '.join(matching_skills[:3])}, which align perfectly with your requirements. Additionally, my experience with {matching_skills[3] if len(matching_skills) > 3 else matching_skills[0]} would allow me to make immediate contributions to your team."""
    
    def _generate_closing_paragraph(self, job_info: Dict[str, Any]) -> str:
        """Generate closing paragraph"""
        return f"""I am particularly drawn to {job_info['company']} because of your focus on {self._extract_company_focus(job_info)}. I am excited about the possibility of contributing to your team and would welcome the opportunity to discuss how my skills and experience align with your needs.""" 