from playwright.sync_api import sync_playwright
from langchain_ollama import OllamaLLM
from langchain.agents import Tool
from langchain.memory import ConversationBufferMemory
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import yaml
from pathlib import Path
import logging
import os
import requests
import json
from typing import Dict, Any
from .anti_bot_handler import AntiBotHandler
from .job_analyzers.lever_analyzer import LeverJobAnalyzer
from .job_portals.lever_navigator import LeverNavigator

# Custom formatter for structured logging
class StructuredFormatter(logging.Formatter):
    def format(self, record):
        if hasattr(record, 'structured_data'):
            # Format structured data nicely
            structured = json.dumps(record.structured_data, indent=2)
            record.msg = f"\n{record.msg}\n{structured}"
        return super().format(record)

def setup_logging():
    """Setup structured logging"""
    # Create logger
    logger = logging.getLogger('application_flow')
    logger.setLevel(logging.DEBUG)
    
    # Clear any existing handlers
    logger.handlers = []
    
    # Add log filter
    class ApplicationFilter(logging.Filter):
        def filter(self, record):
            return not any(name in record.name for name in ['httpx', 'urllib3', 'httpcore'])
    
    # Create formatter
    formatter = StructuredFormatter(
        '%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Setup handlers with filter
    file_handler = logging.FileHandler('application_flow.log')
    file_handler.setFormatter(formatter)
    file_handler.addFilter(ApplicationFilter())
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.addFilter(ApplicationFilter())
    
    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger

# Create logger
logger = setup_logging()

def check_requirements():
    """Check if all required packages are installed and Ollama is running"""
    try:
        import playwright
        import langchain
        import yaml
        import requests
        
        # Check if Ollama is running
        try:
            response = requests.get("http://localhost:11434/api/version")
            if response.status_code == 200:
                logger.info("Ollama is running")
            else:
                logger.error("Ollama is not responding correctly")
                raise ConnectionError("Ollama service is not responding")
        except requests.exceptions.ConnectionError:
            logger.error("Cannot connect to Ollama. Make sure it's running with: ollama serve")
            raise
            
        logger.info("All required packages are installed")
    except ImportError as e:
        logger.error(f"Missing required package: {e}")
        logger.error("Please install required packages:")
        logger.error("pip install playwright langchain-community pyyaml requests")
        raise

# Add this at the start of main()
check_requirements()

class SmartApplicationAgent:
    def __init__(self):
        # Define base paths relative to project root
        self.project_root = Path(__file__).parent.parent
        self.assets_dir = self.project_root / "assets/documents"
        self.resume_dir = self.assets_dir / "resume"
        self.cover_letters_dir = self.assets_dir / "cover_letters"
        
        # Define specific file paths
        self.resume_path = self.resume_dir / "resume.pdf"
        self.cover_letter_path = self.cover_letters_dir / "cover_letter.pdf"
        
        # Validate files exist
        self._validate_files()
        
        # Load configs and initialize tools
        self.config = self._load_config()
        self.llm = OllamaLLM(
            model="llama2",
            base_url="http://localhost:11434",
            temperature=0
        )
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        self.reasoning_chain = self._setup_reasoning_chain()
        self.tools = self._setup_tools()
        
        logger.info(f"Initialized with resume: {self.resume_path}")
        logger.info(f"Using cover letter: {self.cover_letter_path}")
        
        self.logger = logger
        
        # Initialize anti-bot handler
        self.anti_bot = AntiBotHandler(self.config)
        
        # Initialize job analyzer
        self.job_analyzer = LeverJobAnalyzer(
            self.project_root / "assets/documents/resume/resume.json"
        )
        
        # Initialize job portal navigators
        self.lever_navigator = LeverNavigator()
    
    def _validate_files(self):
        """Validate that required files exist"""
        if not self.resume_path.exists():
            raise FileNotFoundError(f"Resume not found at: {self.resume_path}")
        if not self.cover_letter_path.exists():
            raise FileNotFoundError(f"Cover letter not found at: {self.cover_letter_path}")
        
        logger.info("All required files found")
    
    def _setup_reasoning_chain(self):
        """Setup a simple chain for field analysis"""
        prompt = PromptTemplate(
            input_variables=["field_name", "field_type", "required", "chat_history", "config"],
            template="""
            You are a job application assistant. Analyze this form field:
            
            Field Name: {field_name}
            Field Type: {field_type}
            Required: {required}
            Config Data: {config}
            
            Rules:
            1. If field is required -> ACTION: FILL with appropriate value from config
            2. If field is resume/CV upload -> ACTION: UPLOAD
            3. If field is optional -> ACTION: SKIP
            
            Respond with:
            ACTION: [FILL|SKIP|UPLOAD]
            VALUE: [value from config if filling]
            REASON: [brief explanation]
            """
        )
        
        # Create a simple chain
        chain = (
            prompt 
            | self.llm 
            | StrOutputParser()
        )
        
        return chain
    
    def _setup_tools(self):
        """Setup tools available to the agent"""
        return [
            Tool(
                name="analyze_field",
                func=self._analyze_field,
                description="Analyze a form field and decide how to handle it"
            ),
            Tool(
                name="fill_field",
                func=self._fill_field,
                description="Fill a form field with provided value"
            ),
            Tool(
                name="upload_resume",
                func=self._upload_resume,
                description="Upload resume to a file input field"
            )
        ]
    
    def _analyze_field(self, field_info: dict) -> str:
        """Analyze a form field and decide action"""
        try:
            field_name = field_info.get('name', '')
            field_type = field_info.get('type', '')
            required = field_info.get('required', False)
            
            # Skip hidden fields
            if field_type == 'hidden':
                return "ACTION: SKIP\nREASON: Hidden field"
            
            # Handle file uploads
            if field_type == 'file':
                if 'resume' in field_name.lower() or 'cv' in field_name.lower():
                    return "ACTION: UPLOAD\nVALUE: resume.pdf\nREASON: Resume upload field"
                return "ACTION: SKIP\nREASON: Unknown file upload"
            
            # Get value for field
            value = self._get_field_value_from_config(field_name, field_type)
            
            # Handle required fields
            if required:
                if value:
                    return f"ACTION: FILL\nVALUE: {value}\nREASON: Required field"
                return f"ACTION: ALERT\nREASON: Required field needs value"
            
            # Handle optional fields with available data
            if value:
                return f"ACTION: FILL\nVALUE: {value}\nREASON: Optional field with data"
            
            return "ACTION: SKIP\nREASON: Optional field without data"
            
        except Exception as e:
            self.logger.error(
                "Error analyzing field",
                extra={
                    'structured_data': {
                        'error': str(e),
                        'field': field_info
                    }
                }
            )
            return "ACTION: SKIP\nREASON: Error in analysis"
    
    def test_application_flow(self, job_url: str):
        """Test application flow with anti-bot measures"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = self.anti_bot.setup_browser_context(browser)
            page = context.new_page()
            
            try:
                # Navigate to job posting
                self.logger.info(f"Navigating to {job_url}")
                page.goto(job_url)
                page.wait_for_load_state("networkidle")
                
                # Initial human-like behavior
                self.anti_bot.add_human_behavior(page)
                
                # Check for CAPTCHA
                if self.anti_bot.handle_captcha(page):
                    self.logger.info("Proceeding after CAPTCHA")
                
                # Process form fields with human-like delays
                form_fields = self._get_form_fields(page)
                for field in form_fields:
                    self.anti_bot.add_human_behavior(page)
                    
                    # Recheck CAPTCHA after each significant action
                    if "ACTION: FILL" in analysis or "ACTION: UPLOAD" in analysis:
                        if self.anti_bot.handle_captcha(page):
                            self.logger.info("Proceeding after mid-form CAPTCHA")
                    
                    analysis = self._analyze_field(field)
                    self.logger.info(f"Field {field['name']}: {analysis}")
                    
                    if "ACTION: FILL" in analysis:
                        if not self._fill_field(page, field, analysis):
                            if field.get('required'):
                                required_fields.append(field['name'])
                    elif "ACTION: UPLOAD" in analysis:
                        if not self._upload_resume(page):
                            if field.get('required'):
                                required_fields.append(field['name'])
                    elif "ACTION: ALERT" in analysis:
                        required_fields.append(field['name'])
                    
                # Report on required fields
                if required_fields:
                    self.logger.warning(
                        "Missing required fields",
                        extra={
                            'structured_data': {
                                'missing_fields': required_fields
                            }
                        }
                    )
                
                # Take screenshot for verification
                page.screenshot(path="application_test.png")
                
                # Wait for manual verification
                input("Press Enter to close the browser (will not submit)...")
                
            except Exception as e:
                self.logger.error(f"Error in application flow: {e}")
                page.screenshot(path="error_screenshot.png")
                raise
            finally:
                browser.close()
    
    def _get_form_fields(self, page) -> list:
        """Analyze and return all form fields"""
        fields = []
        try:
            # Find all input elements
            input_elements = page.query_selector_all('input, select, textarea')
            logger.info(f"Found {len(input_elements)} form fields")
            
            for input_element in input_elements:
                try:
                    field_info = {
                        'name': input_element.get_attribute('name'),
                        'type': input_element.get_attribute('type'),
                        'required': input_element.get_attribute('required') is not None,
                        'placeholder': input_element.get_attribute('placeholder'),
                        'selector': self._generate_selector(input_element)
                    }
                    fields.append(field_info)
                    logger.debug(f"Found field: {field_info}")
                except Exception as e:
                    logger.warning(f"Error processing field: {e}")
                    continue
                    
            return fields
            
        except Exception as e:
            logger.error(f"Error getting form fields: {e}")
            return fields
    
    def _generate_selector(self, element) -> str:
        """Generate a unique selector for an element"""
        try:
            # Try to get unique attributes
            attributes = {
                'id': element.get_attribute('id'),
                'name': element.get_attribute('name'),
                'class': element.get_attribute('class'),
                'type': element.get_attribute('type')
            }
            
            # Build selector based on available attributes
            if attributes['id']:
                return f"#{attributes['id']}"
            elif attributes['name']:
                return f"[name='{attributes['name']}']"
            elif attributes['class']:
                classes = attributes['class'].split()
                if classes:
                    return f".{'.'.join(classes)}"
            
            # Fallback to a more specific selector using evaluate
            tag_name = element.evaluate("el => el.tagName").lower()
            if attributes['type']:
                return f"{tag_name}[type='{attributes['type']}']"
            
            # Last resort: use a more general selector
            return tag_name
            
        except Exception as e:
            logger.warning(f"Error generating selector: {e}")
            # Return a safe fallback
            return "input"
    
    def _should_upload_resume(self, form_fields) -> bool:
        """Decide if resume should be uploaded"""
        return any(
            field.get('type') == 'file' and 
            ('resume' in (field.get('name') or '').lower() or 
             'cv' in (field.get('name') or '').lower())
            for field in form_fields
        ) 
    
    def _upload_documents(self, page):
        """Handle both resume and cover letter uploads"""
        # Try to upload resume
        resume_uploaded = self._upload_resume(page)
        logger.info(f"Resume upload {'successful' if resume_uploaded else 'failed'}")
        
        # Try to upload cover letter if field exists
        cover_letter_uploaded = self._upload_cover_letter(page)
        logger.info(f"Cover letter upload {'successful' if cover_letter_uploaded else 'failed'}")
        
        return resume_uploaded or cover_letter_uploaded
    
    def _upload_resume(self, page):
        """Upload resume with enhanced selectors"""
        resume_selectors = [
            "input[name='resume']",
            "input[type='file'][name*='resume' i]",
            "input[type='file'][accept='.pdf']",
            "input[type='file'][name*='cv' i]",
            "input[type='file']"
        ]
        
        return self._try_upload_file(page, self.resume_path, resume_selectors, "resume")
    
    def _upload_cover_letter(self, page):
        """Upload cover letter with enhanced selectors"""
        cover_letter_selectors = [
            "input[name='cover_letter']",
            "input[type='file'][name*='cover' i]",
            "input[type='file'][name*='letter' i]",
            "input[type='file']:not([name*='resume' i])"
        ]
        
        return self._try_upload_file(page, self.cover_letter_path, cover_letter_selectors, "cover letter")
    
    def _try_upload_file(self, page, file_path: Path, selectors: list, file_type: str) -> bool:
        """Generic file upload helper"""
        for selector in selectors:
            try:
                elements = page.locator(selector)
                if elements.count() > 0:
                    logger.debug(f"Found {file_type} upload field with selector: {selector}")
                    elements.first.set_input_files(str(file_path))
                    page.wait_for_timeout(1000)  # Wait for upload
                    return True
            except Exception as e:
                logger.debug(f"Failed to upload {file_type} with selector {selector}: {e}")
        
        return False 
    
    def _load_config(self):
        """Load configuration from YAML file"""
        try:
            config_path = self.project_root / "data_folder/plain_text_resume.yaml"
            if not config_path.exists():
                raise FileNotFoundError(f"Config file not found at: {config_path}")
            
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                logger.debug("Configuration loaded successfully")
                return config
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            raise 
    
    def _fill_field(self, page, field: dict, analysis: str):
        """Fill a form field based on analysis"""
        try:
            # Extract value from analysis
            if "VALUE:" not in analysis:
                logger.warning(f"No value found in analysis for field {field['name']}")
                return False

            value = analysis.split("VALUE:")[1].split("\n")[0].strip()
            selector = field['selector']

            # Handle different field types
            field_type = field.get('type', '').lower()
            
            if field_type == 'select':
                page.select_option(selector, value)
            elif field_type == 'checkbox':
                if value.lower() in ['true', 'yes', '1']:
                    page.check(selector)
            elif field_type == 'radio':
                page.check(selector)
            else:  # Default to text input
                page.fill(selector, value)

            logger.debug(f"Filled field {field['name']} with value: {value}")
            return True

        except Exception as e:
            logger.error(f"Error filling field {field['name']}: {e}")
            return False 
    
    def log_field_analysis(self, field: Dict[str, Any], analysis: str):
        """Log field analysis in a structured way"""
        self.logger.info(
            f"Field Analysis: {field.get('name')}",
            extra={
                'structured_data': {
                    'field': {
                        'name': field.get('name'),
                        'type': field.get('type'),
                        'required': field.get('required'),
                        'selector': field.get('selector')
                    },
                    'analysis': {
                        'action': analysis.split('ACTION:')[1].split('\n')[0].strip() if 'ACTION:' in analysis else None,
                        'value': analysis.split('VALUE:')[1].split('\n')[0].strip() if 'VALUE:' in analysis else None,
                        'reason': analysis.split('REASON:')[1].strip() if 'REASON:' in analysis else None
                    }
                }
            }
        )

    def log_form_field(self, field: Dict[str, Any]):
        """Log form field discovery in a structured way"""
        self.logger.debug(
            f"Found form field: {field.get('name')}",
            extra={
                'structured_data': {
                    'field_info': field
                }
            }
        ) 

    def _get_field_value_from_config(self, field_name: str, field_type: str) -> str:
        """Get appropriate value from config based on field name"""
        try:
            field_name = field_name.lower()
            
            # Direct field mappings
            if 'name' in field_name:
                return f"{self.config['personal_information']['name']} {self.config['personal_information']['surname']}"
            elif 'email' in field_name:
                return self.config['personal_information']['email']
            elif 'phone' in field_name:
                return self.config['personal_information']['phone']
            elif 'location' in field_name:
                return f"{self.config['personal_information']['city']}, {self.config['personal_information']['country']}"
            elif 'company' in field_name or 'org' in field_name:
                return self.config['experience_details'][0]['company']
            
            # Handle social media URLs
            if 'linkedin' in field_name:
                return self.config['personal_information']['linkedin']
            elif 'github' in field_name:
                return self.config['personal_information']['github']
            elif 'portfolio' in field_name or 'website' in field_name:
                return self.config['personal_information']['website']
            
            # Handle comments/cover letter
            if 'comments' in field_name or 'cover' in field_name:
                return self._generate_cover_letter()
            
            return None
        except KeyError as e:
            self.logger.error(f"Missing config value: {e}")
            return None
        except Exception as e:
            self.logger.error(f"Error getting field value: {e}")
            return None

    def _generate_cover_letter(self) -> str:
        """Generate cover letter from experience and skills"""
        experience = self.config.get('experience_details', [{}])[0]  # Get most recent experience
        
        cover_letter = f"""Dear Hiring Manager,

I am writing to express my interest in the position. As a {experience.get('position', '')} at {experience.get('company', '')}, 
I have extensive experience in {', '.join(self.config['skills']['programming_languages'][:3])}.

Key achievements:
{experience.get('key_responsibilities', [''])[0]}

I am particularly drawn to this opportunity because of my background in {self.config['skills']['ai_ml'][0]} 
and {self.config['skills']['cloud_services'][0]}.

Best regards,
{self.config['personal_information']['name']} {self.config['personal_information']['surname']}
"""
        return cover_letter 

    def apply_to_lever_job(self, job_url: str):
        """Complete application flow for Lever job"""
        try:
            # First get job details from the main page
            job_details = self.lever_navigator.get_job_details(job_url)
            
            # Analyze job requirements and generate custom content
            job_analysis = self.job_analyzer.analyze_job(job_details)
            logger.info(
                "Job analyzed",
                extra={'structured_data': {'job_analysis': job_analysis}}
            )
            
            # Generate custom cover letter based on job details
            cover_letter = self.job_analyzer.generate_cover_letter(job_analysis)
            
            # Save this application attempt
            self._save_application_details(job_details, job_analysis, cover_letter)
            
            # Navigate to the application page
            apply_url = job_details['apply_url']
            logger.info(f"Proceeding to application form: {apply_url}")
            
            # Start the actual application process
            self.test_application_flow(apply_url)
            
        except Exception as e:
            logger.error(f"Error in Lever application flow: {e}")
            raise
    
    def _save_application_details(self, job_details: Dict, analysis: Dict, cover_letter: str):
        """Save details of this application attempt"""
        try:
            application_record = {
                'job_details': job_details,
                'analysis': analysis,
                'cover_letter': cover_letter,
                'timestamp': datetime.now().isoformat(),
                'status': 'attempted'
            }
            
            # Save to applications history
            history_file = self.project_root / "data_folder/application_history.json"
            existing_history = []
            
            if history_file.exists():
                with open(history_file, 'r') as f:
                    existing_history = json.load(f)
            
            existing_history.append(application_record)
            
            with open(history_file, 'w') as f:
                json.dump(existing_history, f, indent=2)
                
            logger.info("Application details saved to history")
            
        except Exception as e:
            logger.error(f"Error saving application details: {e}") 