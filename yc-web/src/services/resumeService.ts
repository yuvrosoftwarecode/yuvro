import restApiAuthUtil from '../utils/RestApiAuthUtil';

export interface ResumeSettings {
  template: string;
  font: string;
  color: string;
  fontSize?: number;
  lineSpacing?: number;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'free' | 'premium';
  popular?: boolean;
  new?: boolean;
}

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export interface FontOption {
  id: string;
  name: string;
  family: string;
}

class ResumeService {
  private baseUrl = '/api/auth/resume';

  async generateResumePDF(settings?: ResumeSettings): Promise<void> {
    try {
      const response: any = await restApiAuthUtil.post(`${this.baseUrl}/generate-pdf/`, {
        settings: settings || {}
      });

      if (response.data instanceof Blob) {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        const contentDisposition = response.headers?.['content-disposition'];
        let filename = 'Resume.pdf';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
        
        return;
      } else {
        const jsonResponse = response.data;
        
        if (jsonResponse.fallback && jsonResponse.html_content) {
          await this.generatePDFFromHTML(jsonResponse.html_content, settings);
          return;
        }
        
        throw new Error(jsonResponse.error || 'Failed to generate PDF');
      }
    } catch (error: any) {
      console.error('Error generating resume PDF:', error);
      
      if (error.response?.status >= 500) {
        console.log('Backend failed, trying frontend generation...');
        await this.generateResumeWithFrontend(settings);
        return;
      }
      
      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to generate resume PDF'
      );
    }
  }

  private async generatePDFFromHTML(htmlContent: string, settings?: ResumeSettings): Promise<void> {
    try {
      const html2pdf = (await import('html2pdf.js' as any)).default;
      
      const opt = {
        margin: [10, 10, 10, 10], 
        filename: `Resume_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { 
          type: 'jpeg' as const, 
          quality: 1.0 
        },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794, 
          height: 1123 
        },
        jsPDF: { 
          unit: 'mm' as const, 
          format: 'a4' as const, 
          orientation: 'portrait' as const,
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'] as const,
          before: '.page-break-before',
          after: '.page-break-after',
          avoid: '.no-page-break'
        }
      };

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '794px'; 
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = settings?.font || 'Inter, sans-serif';
      
      await this.ensureFontsLoaded();
      
      document.body.appendChild(tempDiv);

      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await html2pdf().set(opt).from(tempDiv).save();
        console.log('Resume PDF generated successfully with template styles preserved');
      } finally {
        document.body.removeChild(tempDiv);
      }
    } catch (error) {
      console.error('Frontend PDF generation failed:', error);
      throw new Error('PDF generation failed. Please try again.');
    }
  }

  private async ensureFontsLoaded(): Promise<void> {
    try {
      if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&family=Open+Sans:wght@300;400;600;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if ('fonts' in document) {
        await (document as any).fonts.ready;
      }
    } catch (error) {
      console.warn('Font loading failed:', error);
    }
  }

  private async generateResumeWithFrontend(settings?: ResumeSettings): Promise<void> {
    try {
      const profileResponse: any = await restApiAuthUtil.get('/api/auth/profile/detail/');
      const profile = profileResponse.data;
      
      const { generateResumePDF } = await import('../utils/resumeGenerator');
      await generateResumePDF(profile, settings);
    } catch (error) {
      console.error('Frontend resume generation failed:', error);
      throw new Error('Resume generation failed. Please try again.');
    }
  }

  async getResumeTemplates(): Promise<{
    templates: ResumeTemplate[];
    colorSchemes: ColorScheme[];
    fonts: FontOption[];
  }> {
    try {
      const response: any = await restApiAuthUtil.get(`${this.baseUrl}/templates/`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching resume templates:', error);
      
      return {
        templates: [
          {
            id: 'classic',
            name: 'Classic Professional',
            description: 'Clean and traditional layout perfect for corporate roles',
            category: 'free',
            popular: true,
          },
          {
            id: 'modern',
            name: 'Modern Minimal',
            description: 'Sleek design with focus on content and readability',
            category: 'free',
          },
          {
            id: 'creative',
            name: 'Creative Design',
            description: 'Eye-catching layout for creative professionals',
            category: 'free',
          },
          {
            id: 'compact',
            name: 'Compact Single Page',
            description: 'All information in one page efficiently',
            category: 'free',
          },
        ],
        colorSchemes: [
          { id: 'default', name: 'Default', primary: '#374151', accent: '#6b7280' },
          { id: 'blue', name: 'Professional Blue', primary: '#1e40af', accent: '#3b82f6' },
          { id: 'green', name: 'Nature Green', primary: '#166534', accent: '#22c55e' },
          { id: 'purple', name: 'Creative Purple', primary: '#7c3aed', accent: '#a78bfa' },
          { id: 'red', name: 'Bold Red', primary: '#dc2626', accent: '#ef4444' },
          { id: 'teal', name: 'Modern Teal', primary: '#0d9488', accent: '#14b8a6' },
        ],
        fonts: [
          { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
          { id: 'roboto', name: 'Roboto', family: 'Roboto, sans-serif' },
          { id: 'opensans', name: 'Open Sans', family: 'Open Sans, sans-serif' },
          { id: 'lato', name: 'Lato', family: 'Lato, sans-serif' },
        ]
      };
    }
  }

  async generateQuickResume(): Promise<void> {
    const defaultSettings: ResumeSettings = {
      template: 'classic',
      font: 'inter',
      color: 'default'
    };
    
    return this.generateResumePDF(defaultSettings);
  }
}

export const resumeService = new ResumeService();
export default resumeService;