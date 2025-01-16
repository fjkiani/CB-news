from src.test_application_flow import SmartApplicationAgent, check_requirements
import logging
import json

def main():
    try:
        # Setup logging for test flow
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler('test_flow.log'),
                logging.StreamHandler()
            ]
        )
        logger = logging.getLogger('test_flow')
        
        # Log test start
        logger.info(
            "Starting application test",
            extra={
                'structured_data': {
                    'test_url': "https://jobs.lever.co/snowplow/0212200f-58fc-4c18-824b-d66ec999b7dd/apply",
                    'mode': 'test'
                }
            }
        )
        
        # Run test
        agent = SmartApplicationAgent()
        agent.test_application_flow("https://jobs.lever.co/snowplow/0212200f-58fc-4c18-824b-d66ec999b7dd/apply")
        
    except Exception as e:
        logger.error(
            "Test failed",
            extra={
                'structured_data': {
                    'error': str(e),
                    'error_type': type(e).__name__
                }
            }
        )
        raise

if __name__ == "__main__":
    main() 