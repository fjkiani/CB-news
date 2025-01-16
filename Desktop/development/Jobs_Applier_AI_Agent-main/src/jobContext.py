from src.job import Job
from src.job_application import JobApplication


from dataclasses import dataclass

@dataclass
class JobContext:
    def __init__(self):
        self.job = None
        self.resume = None
        self.cover_letter = None