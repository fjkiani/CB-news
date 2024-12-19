import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time

# Load environment variables
load_dotenv()

# Constants
NEWS_URL = "https://tradingeconomics.com/stream?c=united+states"  # Updated URL
DATA_FILE = "last_news.json"
DIFFBOT_TOKEN = os.getenv('DIFFBOT_TOKEN')
DIFFBOT_URL = f"https://api.diffbot.com/v3/analyze?token={DIFFBOT_TOKEN}"

# Add token check
if not DIFFBOT_TOKEN:
    print("Error: DIFFBOT_TOKEN not found in environment variables")
    sys.exit(1)

print(f"Loaded Diffbot token: {DIFFBOT_TOKEN[:10]}...")

def get_top_news_item():
    """
    Fetches the page using Selenium and returns the top news item title and URL.
    """
    driver = None
    try:
        print("Setting up Chrome driver...")
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

        # Use webdriver_manager to handle driver installation
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        print("Fetching news page...")
        driver.get(NEWS_URL)
        
        # Wait for content to load
        print("Waiting for content to load...")
        wait = WebDriverWait(driver, 20)
        
        # Try to find news items
        news_items = wait.until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".te-stream-title"))
        )
        
        if news_items:
            first_news = news_items[0]
            title = first_news.text.strip()
            url = first_news.get_attribute("href")
            
            print(f"\nFound news item: '{title}'")
            print(f"URL: {url}\n")
            return title, url
                
        print("No news items found!")
        return None, None
        
    except Exception as e:
        print(f"Error with Selenium: {e}")
        return None, None
        
    finally:
        if driver:
            driver.quit()

def load_last_news():
    """
    Loads the previously saved news item
    """
    print("Loading last saved news...")
    if not os.path.exists(DATA_FILE):
        print(f"No previous data file found ({DATA_FILE})")
        return None, None
        
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Last saved news: '{data.get('title')}'")
            return data.get('title'), data.get('url')
    except Exception as e:
        print(f"Error loading last news: {e}")
        return None, None

def save_last_news(title, url):
    """
    Saves the current news item
    """
    print("Saving current news...")
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            data = {
                'title': title, 
                'url': url,
                'last_checked': datetime.now().isoformat()
            }
            json.dump(data, f, indent=2)
            print("News saved successfully")
    except Exception as e:
        print(f"Error saving news: {e}")

def process_with_diffbot(url):
    print("\nProcessing with Diffbot...")
    try:
        # Construct the Diffbot URL with the correct mode
        diffbot_url = f"{DIFFBOT_URL}&url={url}&mode=article"
        print(f"Calling Diffbot API: {diffbot_url}")
        
        headers = {
            "Content-Type": "application/json"
        }
        
        diffbot_response = requests.get(diffbot_url, headers=headers)
        diffbot_response.raise_for_status()
        
        structured_data = diffbot_response.json()
        print(f"Diffbot raw response: {json.dumps(structured_data, indent=2)}")
        
        if structured_data.get('objects'):
            article = structured_data['objects'][0]
            
            # Extract the data we need
            processed_article = [{
                'date': article.get('estimatedDate') or article.get('date'),
                'sentiment': article.get('sentiment', 0),
                'author': article.get('author') or 'Trading Economics',
                'text': article.get('text'),
                'title': article.get('title'),
                'url': url
            }]
            
            print(f"Processed article: {json.dumps(processed_article, indent=2)}")
            return processed_article
            
        print("No article data found in Diffbot response")
        return None
            
    except Exception as e:
        print(f"Error processing with Diffbot: {e}")
        if 'diffbot_response' in locals():
            print(f"Response status: {diffbot_response.status_code}")
            print(f"Response text: {diffbot_response.text}")
        return None

def main():
    try:
        print("Starting monitoring process...")
        current_title, current_url = get_top_news_item()
        
        if not current_title or not current_url:
            print("\n❌ Failed to fetch current news.")
            print(json.dumps({'error': 'Failed to fetch news'}))
            return

        # Process with Diffbot and return results
        articles = process_with_diffbot(current_url)
        if articles:
            # Prepare data
            result = {
                'success': True,
                'articles': articles,
                'metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'source_url': current_url,
                    'title': current_title
                }
            }
            print(json.dumps(result))
        else:
            print(json.dumps({
                'success': False,
                'error': 'Failed to process articles'
            }))

    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == "__main__":
    main()