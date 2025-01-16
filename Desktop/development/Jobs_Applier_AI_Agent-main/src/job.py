from dataclasses import dataclass
from src.logging import logger

@dataclass
class Job:
    role: str = ""
    company: str = ""
    location: str = ""
    link: str = ""
    apply_method: str = ""
    description: str = ""
    summarize_job_description: str = ""
    recruiter_link: str = ""
    resume_path: str = ""
    cover_letter_path: str = ""

    def __init__(self, title, company, location, job_description, application_url, source):
        self.title = title
        self.company = company
        self.location = location
        self.job_description = job_description
        self.application_url = application_url  # This suggests it handles job URLs
        self.source = source  # This suggests it can handle different sources like LinkedIn

    def formatted_job_information(self):
        """
        Formats the job information as a markdown string.
        """
        logger.debug(f"Formatting job information for job: {self.role} at {self.company}")
        job_information = f"""
        # Job Description
        ## Job Information 
        - Position: {self.role}
        - At: {self.company}
        - Location: {self.location}
        - Recruiter Profile: {self.recruiter_link or 'Not available'}
        
        ## Description
        {self.description or 'No description provided.'}
        """
        formatted_information = job_information.strip()
        logger.debug(f"Formatted job information: {formatted_information}")
        return formatted_information