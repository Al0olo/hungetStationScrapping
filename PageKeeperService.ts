import puppeteer, { Browser, Page } from 'puppeteer';

interface HungerStationCredentials {
  username: string;
  password: string;
  url: string;
}

class PageKeeperService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isActive: boolean = false;

  constructor(private credentials: HungerStationCredentials) {}

  async startSession(): Promise<{ success: boolean, message: string }> {
    if (this.isActive) {
      return { 
        success: false, 
        message: 'Session is already active' 
      };
    }

    try {
      await this.initializeBrowser();
      await this.login();
      
      this.isActive = true;
      return { 
        success: true, 
        message: 'Successfully logged in and keeping page open' 
      };
    } catch (error: any) {
      console.error('Failed to start session:', error);
      await this.cleanup();
      return { 
        success: false, 
        message: `Failed to start session: ${error.message}` 
      };
    }
  }

  async stopSession(): Promise<{ success: boolean, message: string }> {
    try {
      await this.cleanup();
      return { 
        success: true, 
        message: 'Session stopped successfully' 
      };
    } catch (error: any) {
      console.error('Failed to stop session:', error);
      return { 
        success: false, 
        message: `Failed to stop session: ${error.message}` 
      };
    }
  }

  async getSessionStatus(): Promise<{ 
    active: boolean, 
    pageUrl: string | null,
    uptime: number | null 
  }> {
    return {
      active: this.isActive,
      pageUrl: this.page ? await this.page.url() : null,
      uptime: this.isActive ? process.uptime() : null
    };
  }

  private async initializeBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--start-maximized'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1920, height: 1080 });

      // Keep the page alive
      this.page.on('error', this.handlePageError.bind(this));
      this.browser.on('disconnected', this.handleBrowserDisconnect.bind(this));

    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  private async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Navigate to login page
      await this.page.goto(this.credentials.url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Check if already logged in
      const loginButton = await this.page.$('#login-button');
      if (!loginButton) {
        console.log('Already logged in');
        return;
      }

      // Perform login
      await this.page.type('#username', this.credentials.username);
      await this.page.type('#password', this.credentials.password);
      await this.page.click('#login-button');

      // Wait for login to complete
      await this.page.waitForNavigation({ 
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Verify login success
      const loginError = await this.page.$('.login-error');
      if (loginError) {
        throw new Error('Login failed - invalid credentials');
      }

      console.log('Successfully logged in to X system');

    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  private async handlePageError(error: Error): Promise<void> {
    console.error('Page error occurred:', error);
    try {
      await this.cleanup();
      await this.startSession();
    } catch (recoveryError) {
      console.error('Failed to recover from page error:', recoveryError);
      this.isActive = false;
    }
  }

  private async handleBrowserDisconnect(): Promise<void> {
    console.warn('Browser disconnected unexpectedly');
    this.isActive = false;
    this.browser = null;
    this.page = null;
    await this.startSession();
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isActive = false;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

export default PageKeeperService;