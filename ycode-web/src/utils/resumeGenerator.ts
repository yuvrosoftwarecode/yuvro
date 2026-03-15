import { Profile } from '../services/profileService';

const resumeCache = new Map<string, string>();

const generateHTMLResume = (profile: Profile, settings?: any): string => {
  const colorSchemes = {
    default: { 
      primary: '#374151', 
      accent: '#6b7280',
      bg: '#f3f4f6',
      gradient: 'linear-gradient(135deg, #374151, #6b7280)'
    },
    blue: { 
      primary: '#1e40af', 
      accent: '#3b82f6',
      bg: '#dbeafe',
      gradient: 'linear-gradient(135deg, #1e40af, #3b82f6)'
    },
    green: { 
      primary: '#166534', 
      accent: '#22c55e',
      bg: '#dcfce7',
      gradient: 'linear-gradient(135deg, #166534, #22c55e)'
    },
    purple: { 
      primary: '#7c3aed', 
      accent: '#a78bfa',
      bg: '#ede9fe',
      gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)'
    },
    red: { 
      primary: '#dc2626', 
      accent: '#ef4444',
      bg: '#fee2e2',
      gradient: 'linear-gradient(135deg, #dc2626, #ef4444)'
    },
    teal: { 
      primary: '#0d9488', 
      accent: '#14b8a6',
      bg: '#ccfbf1',
      gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)'
    },
  };

  const fontFamilies = {
    inter: 'Inter, Arial, sans-serif',
    roboto: 'Roboto, Arial, sans-serif',
    opensans: 'Open Sans, Arial, sans-serif',
    lato: 'Lato, Arial, sans-serif',
  };

  const selectedColorScheme = settings?.color || 'default';
  const selectedFont = settings?.font || 'inter';
  const selectedTemplate = settings?.template || 'classic';

  const colors = colorSchemes[selectedColorScheme as keyof typeof colorSchemes] || colorSchemes.default;
  const fontFamily = fontFamilies[selectedFont as keyof typeof fontFamilies] || fontFamilies.inter;

  const baseStyles = `
    font-family: ${fontFamily};
    line-height: 1.6;
    color: #1f2937;
    background: white;
    font-size: 14px;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.full_name || 'Student Name'} - Resume</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        
        * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
        }
        
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }
        
        body {
            ${baseStyles}
        }
        
        .section-header {
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 16px;
        }
        
        .classic-header {
            color: ${colors.primary};
            border-bottom: 2px solid ${colors.primary};
            padding-bottom: 4px;
            font-size: 18px;
        }
        
        .compact-header {
            color: ${colors.primary};
            border-bottom: 1px solid ${colors.primary};
            padding-bottom: 4px;
            font-size: 14px;
        }
        
        .creative-header {
            background: ${colors.gradient};
            color: white;
            padding: 8px 16px;
            margin: 0 -16px;
            border-radius: 8px;
            font-size: 18px;
        }
        
        .skill-tag {
            background: ${colors.bg};
            color: ${colors.primary};
            padding: 4px 12px;
            border-radius: 4px;
            border: 1px solid ${colors.primary};
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin: 2px;
        }
    </style>
</head>
<body>
    <div style="width: 100%; background: white;">
        ${selectedTemplate === 'modern' ? `
            <div style="display: flex; gap: 32px;">
                <div style="width: 40%; background: ${colors.gradient}; color: white; padding: 32px; margin: -40px 0 -40px -40px; min-height: 100vh;">
                    <!-- Contact Info -->
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: bold; color: white; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Contact</h2>
                        <div style="font-size: 14px;">
                            ${profile.links?.email ? `<p style="color: rgba(255,255,255,0.9); margin: 4px 0;">${profile.links.email}</p>` : ''}
                            ${profile.location ? `<p style="color: rgba(255,255,255,0.9); margin: 4px 0;">${profile.location}</p>` : ''}
                            ${profile.links?.linkedin ? `<p style="color: rgba(255,255,255,0.9); margin: 4px 0;">${profile.links.linkedin}</p>` : ''}
                            ${profile.links?.github ? `<p style="color: rgba(255,255,255,0.9); margin: 4px 0;">${profile.links.github}</p>` : ''}
                        </div>
                    </div>
                    
                    <!-- Skills -->
                    ${profile.skills && profile.skills.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <h2 style="font-size: 18px; font-weight: bold; color: white; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 4px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em;">Skills</h2>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${profile.skills.map(skill => `<span style="background: rgba(255,255,255,0.2); color: white; padding: 4px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.3); font-size: 12px; font-weight: bold;">${skill.name}</span>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div style="flex: 1;">
                    <!-- Header -->
                    <div style="text-align: left; padding-bottom: 20px; margin-bottom: 32px;">
                        <h1 style="font-size: 36px; font-weight: bold; color: ${colors.primary}; margin-bottom: 8px;">${profile.full_name || 'Student Name'}</h1>
                        <p style="font-size: 18px; color: ${colors.accent}; margin-bottom: 12px;">${profile.title || 'Professional'}</p>
                    </div>
        ` : selectedTemplate === 'creative' ? `
            <!-- Creative Header -->
            <div style="text-align: center; background: ${colors.gradient}; color: white; padding: 40px; margin: -40px -40px 32px -40px; border-radius: 0 0 24px 24px;">
                <h1 style="font-size: 36px; font-weight: bold; color: white; margin-bottom: 8px;">${profile.full_name || 'Student Name'}</h1>
                <p style="font-size: 18px; color: rgba(255,255,255,0.9); margin-bottom: 12px;">${profile.title || 'Professional'}</p>
                <div style="font-size: 14px; color: rgba(255,255,255,0.8);">
                    ${profile.links?.email ? `<span>${profile.links.email}</span>` : ''}
                    ${profile.location ? `<span> | </span><span>${profile.location}</span>` : ''}
                    ${profile.links?.linkedin ? `<span> | </span><span>${profile.links.linkedin}</span>` : ''}
                </div>
            </div>
        ` : selectedTemplate === 'compact' ? `
            <!-- Compact Header -->
            <div style="text-align: center; border-bottom: 2px solid ${colors.primary}; padding-bottom: 16px; margin-bottom: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; color: ${colors.primary}; margin-bottom: 4px;">${profile.full_name || 'Student Name'}</h1>
                <p style="font-size: 16px; color: ${colors.accent}; margin-bottom: 8px;">${profile.title || 'Professional'}</p>
                <div style="font-size: 12px; color: #6b7280;">
                    ${profile.links?.email ? `<span>${profile.links.email}</span>` : ''}
                    ${profile.location ? `<span> | </span><span>${profile.location}</span>` : ''}
                    ${profile.links?.linkedin ? `<span> | </span><span>${profile.links.linkedin}</span>` : ''}
                </div>
            </div>
        ` : `
            <!-- Classic Header -->
            <div style="text-align: center; border-bottom: 2px solid ${colors.primary}; padding-bottom: 20px; margin-bottom: 32px;">
                <h1 style="font-size: 36px; font-weight: bold; color: ${colors.primary}; margin-bottom: 8px;">${profile.full_name || 'Student Name'}</h1>
                <p style="font-size: 18px; color: ${colors.accent}; margin-bottom: 12px;">${profile.title || 'Professional'}</p>
                <div style="font-size: 14px; color: #6b7280;">
                    ${profile.links?.email ? `<span>${profile.links.email}</span>` : ''}
                    ${profile.location ? `<span> | </span><span>${profile.location}</span>` : ''}
                    ${profile.links?.linkedin ? `<span> | </span><span>${profile.links.linkedin}</span>` : ''}
                </div>
            </div>
        `}
        
        ${profile.about ? `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h2 class="section-header ${selectedTemplate === 'creative' ? 'creative-header' : selectedTemplate === 'compact' ? 'compact-header' : 'classic-header'}" style="${selectedTemplate === 'creative' ? `background: ${colors.gradient}; color: white; padding: 8px 16px; margin: 0 -16px 16px -16px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : selectedTemplate === 'compact' ? `color: ${colors.primary}; border-bottom: 1px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : `color: ${colors.primary}; border-bottom: 2px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;`}">Professional Summary</h2>
            <div style="${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} line-height: 1.6;">
                <p style="color: #1f2937;">${profile.about}</p>
            </div>
        </div>
        ` : ''}
        
        ${profile.experiences && profile.experiences.length > 0 ? `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h2 style="${selectedTemplate === 'creative' ? `background: ${colors.gradient}; color: white; padding: 8px 16px; margin: 0 -16px 16px -16px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : selectedTemplate === 'compact' ? `color: ${colors.primary}; border-bottom: 1px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : `color: ${colors.primary}; border-bottom: 2px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;`}">Experience</h2>
            <div style="${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} line-height: 1.6;">
                ${profile.experiences.map(exp => `
                <div style="margin-bottom: 16px; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <span style="font-weight: bold; color: ${colors.primary}; ${selectedTemplate === 'compact' ? 'font-size: 14px;' : 'font-size: 16px;'} flex: 1;">${exp.role || 'Position'}</span>
                        <span style="font-size: 12px; color: #6b7280; font-style: italic; text-align: right;">${exp.duration || 'Duration'}</span>
                    </div>
                    <p style="color: #6b7280; ${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} margin-bottom: 8px;">${exp.company || 'Company'}</p>
                    ${exp.description_list && exp.description_list.length > 0 ? `
                    <div style="margin-left: 20px; margin-top: 4px;">
                        <ul style="list-style-type: disc; margin: 0; padding-left: 20px;">
                            ${exp.description_list.map(desc => `<li style="color: #1f2937; margin: 4px 0;">${desc}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}
                    ${exp.technologies && exp.technologies.length > 0 ? `
                    <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                        <strong style="color: ${colors.accent};">Technologies:</strong> ${exp.technologies.join(', ')}
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${profile.projects && profile.projects.length > 0 ? `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h2 style="${selectedTemplate === 'creative' ? `background: ${colors.gradient}; color: white; padding: 8px 16px; margin: 0 -16px 16px -16px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : selectedTemplate === 'compact' ? `color: ${colors.primary}; border-bottom: 1px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : `color: ${colors.primary}; border-bottom: 2px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;`}">Projects</h2>
            <div style="${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} line-height: 1.6;">
                ${profile.projects.map(project => `
                <div style="margin-bottom: 16px; page-break-inside: avoid;">
                    <div style="margin-bottom: 4px;">
                        <span style="font-weight: bold; color: ${colors.primary}; ${selectedTemplate === 'compact' ? 'font-size: 14px;' : 'font-size: 16px;'}">${project.title || 'Project'}</span>
                    </div>
                    <p style="color: #6b7280; ${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} margin-bottom: 8px;">${project.role || 'Developer'}</p>
                    ${project.description ? `
                    <div style="margin-bottom: 8px;">
                        <p style="color: #1f2937;">${project.description}</p>
                    </div>
                    ` : ''}
                    ${project.tech_stack && project.tech_stack.length > 0 ? `
                    <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                        <strong style="color: ${colors.accent};">Technologies:</strong> ${project.tech_stack.join(', ')}
                    </div>
                    ` : ''}
                    ${project.github_link || project.live_link ? `
                    <div style="margin-top: 4px; font-size: 12px;">
                        ${project.github_link ? `<a href="${project.github_link}" style="color: ${colors.accent}; text-decoration: none;">GitHub</a>` : ''}
                        ${project.live_link ? `${project.github_link ? ' | ' : ''}<a href="${project.live_link}" style="color: ${colors.accent}; text-decoration: none;">Live Demo</a>` : ''}
                    </div>
                    ` : ''}
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${profile.education && profile.education.length > 0 ? `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h2 style="${selectedTemplate === 'creative' ? `background: ${colors.gradient}; color: white; padding: 8px 16px; margin: 0 -16px 16px -16px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : selectedTemplate === 'compact' ? `color: ${colors.primary}; border-bottom: 1px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : `color: ${colors.primary}; border-bottom: 2px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;`}">Education</h2>
            <div style="${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} line-height: 1.6;">
                ${profile.education.map(edu => `
                <div style="margin-bottom: 12px; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <span style="font-weight: bold; color: ${colors.primary}; ${selectedTemplate === 'compact' ? 'font-size: 14px;' : 'font-size: 16px;'} flex: 1;">${edu.institution || 'Institution'}</span>
                        <span style="font-size: 12px; color: #6b7280; font-style: italic; text-align: right;">${edu.duration || 'Duration'}</span>
                    </div>
                    <p style="color: #6b7280; ${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'}">${edu.degree || 'Degree'} in ${edu.field || 'Field'}</p>
                    ${edu.cgpa ? `<p style="color: #1f2937; font-size: 12px;">CGPA: ${edu.cgpa}</p>` : ''}
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${profile.skills && profile.skills.length > 0 && selectedTemplate !== 'modern' ? `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h2 style="${selectedTemplate === 'creative' ? `background: ${colors.gradient}; color: white; padding: 8px 16px; margin: 0 -16px 16px -16px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : selectedTemplate === 'compact' ? `color: ${colors.primary}; border-bottom: 1px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : `color: ${colors.primary}; border-bottom: 2px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;`}">Skills</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${profile.skills.map(skill => `<span style="background: ${colors.bg}; color: ${colors.primary}; padding: 4px 12px; border-radius: 4px; border: 1px solid ${colors.primary}; font-size: 12px; font-weight: bold; display: inline-block;">${skill.name}</span>`).join('')}
            </div>
        </div>
        ` : ''}
        
        ${profile.certifications && profile.certifications.length > 0 ? `
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
            <h2 style="${selectedTemplate === 'creative' ? `background: ${colors.gradient}; color: white; padding: 8px 16px; margin: 0 -16px 16px -16px; border-radius: 8px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : selectedTemplate === 'compact' ? `color: ${colors.primary}; border-bottom: 1px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;` : `color: ${colors.primary}; border-bottom: 2px solid ${colors.primary}; padding-bottom: 4px; margin-bottom: 16px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;`}">Certifications</h2>
            <div style="${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'} line-height: 1.6;">
                ${profile.certifications.map(cert => `
                <div style="margin-bottom: 12px; page-break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <span style="font-weight: bold; color: ${colors.primary}; ${selectedTemplate === 'compact' ? 'font-size: 14px;' : 'font-size: 16px;'} flex: 1;">${cert.name || 'Certification'}</span>
                        <span style="font-size: 12px; color: #6b7280; font-style: italic; text-align: right;">${cert.completion_date || 'Date'}</span>
                    </div>
                    <p style="color: #6b7280; ${selectedTemplate === 'compact' ? 'font-size: 12px;' : 'font-size: 14px;'}">${cert.issuer || 'Issuer'}</p>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${selectedTemplate === 'modern' ? `
                </div> <!-- Close main-content -->
            </div> <!-- Close flex container -->
        ` : ''}
    </div>
</body>
</html>
  `;
};

export const generateResumePDF = async (profile: Profile, settings?: any): Promise<void> => {
  try {
    const cacheKey = JSON.stringify({
      name: profile.full_name,
      title: profile.title,
      skillsCount: profile.skills?.length || 0,
      experienceCount: profile.experiences?.length || 0,
      projectsCount: profile.projects?.length || 0,
      template: settings?.template || 'classic',
      color: settings?.color || 'default',
      font: settings?.font || 'inter'
    });

    let htmlContent = resumeCache.get(cacheKey);

    if (!htmlContent) {
      htmlContent = generateHTMLResume(profile, settings);
      resumeCache.set(cacheKey, htmlContent);

      if (resumeCache.size > 10) {
        const firstKey = resumeCache.keys().next().value;
        if (firstKey) {
          resumeCache.delete(firstKey);
        }
      }
    }

    try {
      const html2pdf = (await import('html2pdf.js' as any)).default;

      const fontFamilies = {
        inter: 'Inter, Arial, sans-serif',
        roboto: 'Roboto, Arial, sans-serif',
        opensans: 'Open Sans, Arial, sans-serif',
        lato: 'Lato, Arial, sans-serif',
      };
      const selectedFont = settings?.font || 'inter';
      const fontFamily = fontFamilies[selectedFont as keyof typeof fontFamilies] || fontFamilies.inter;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${(profile.full_name || 'Resume').replace(/\s+/g, '_')}_Resume_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { 
          type: 'jpeg', 
          quality: 1.0 
        },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          letterRendering: true,
          logging: false,
          width: 794,
          height: 1123
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 794px;
        background: white;
        font-family: ${fontFamily};
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      `;

      document.body.appendChild(tempDiv);

      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        await html2pdf().set(opt).from(tempDiv).save();
        console.log('Resume PDF generated successfully with template styles preserved');
      } finally {
        document.body.removeChild(tempDiv);
      }
    } catch (error) {
      console.warn('html2pdf not available, falling back to text format:', error);

      const textResume = generateTextResume(profile);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${(profile.full_name || 'Resume').replace(/\s+/g, '_')}_Resume_${timestamp}.txt`;

      const blob = new Blob([textResume], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      console.log('Resume downloaded as text file:', filename);
    }

  } catch (error) {
    console.error('Error generating resume:', error);
    throw new Error('Failed to generate resume');
  }
};

const generateTextResume = (profile: Profile): string => {
  let resume = '';

  resume += `${profile.full_name || 'Student Name'}\n`;
  if (profile.title) resume += `${profile.title}\n`;
  resume += '='.repeat(60) + '\n\n';

  if (profile.links?.email || profile.location || profile.links?.linkedin || profile.links?.github) {
    resume += 'CONTACT INFORMATION\n';
    resume += '-'.repeat(25) + '\n';
    if (profile.links?.email) resume += `Email: ${profile.links.email}\n`;
    if (profile.location) resume += `Location: ${profile.location}\n`;
    if (profile.links?.linkedin) resume += `LinkedIn: ${profile.links.linkedin}\n`;
    if (profile.links?.github) resume += `GitHub: ${profile.links.github}\n`;
    resume += '\n';
  }

  if (profile.about) {
    resume += 'ABOUT\n';
    resume += '-'.repeat(25) + '\n';
    resume += `${profile.about}\n\n`;
  }

  if (profile.skills && profile.skills.length > 0) {
    resume += 'SKILLS\n';
    resume += '-'.repeat(25) + '\n';
    profile.skills.forEach(skill => {
      resume += `• ${skill.name} (${skill.level || 'Intermediate'})\n`;
    });
    resume += '\n';
  }

  if (profile.experiences && profile.experiences.length > 0) {
    resume += 'EXPERIENCE\n';
    resume += '-'.repeat(25) + '\n';
    profile.experiences.forEach(exp => {
      resume += `${exp.role || 'Position'}\n`;
      resume += `${exp.company || 'Company'} | ${exp.duration || 'Duration'}\n`;
      if (exp.description_list && exp.description_list.length > 0) {
        exp.description_list.forEach(desc => {
          resume += `  • ${desc}\n`;
        });
      }
      if (exp.technologies && exp.technologies.length > 0) {
        resume += `  Technologies: ${exp.technologies.join(', ')}\n`;
      }
      resume += '\n';
    });
  }

  if (profile.projects && profile.projects.length > 0) {
    resume += 'PROJECTS\n';
    resume += '-'.repeat(25) + '\n';
    profile.projects.forEach(project => {
      resume += `${project.title || 'Project'}\n`;
      resume += `Role: ${project.role || 'Developer'}\n`;
      if (project.description) resume += `${project.description}\n`;
      if (project.tech_stack && project.tech_stack.length > 0) {
        resume += `Technologies: ${project.tech_stack.join(', ')}\n`;
      }
      if (project.github_link) resume += `GitHub: ${project.github_link}\n`;
      if (project.live_link) resume += `Live: ${project.live_link}\n`;
      resume += '\n';
    });
  }

  if (profile.education && profile.education.length > 0) {
    resume += 'EDUCATION\n';
    resume += '-'.repeat(25) + '\n';
    profile.education.forEach(edu => {
      resume += `${edu.institution || 'Institution'}\n`;
      resume += `${edu.degree || 'Degree'} in ${edu.field || 'Field'}\n`;
      resume += `${edu.duration || 'Duration'}`;
      if (edu.cgpa) resume += ` | CGPA: ${edu.cgpa}`;
      resume += '\n\n';
    });
  }

  if (profile.certifications && profile.certifications.length > 0) {
    resume += 'CERTIFICATIONS\n';
    resume += '-'.repeat(25) + '\n';
    profile.certifications.forEach(cert => {
      resume += `${cert.name || 'Certification'}\n`;
      resume += `${cert.issuer || 'Issuer'} | ${cert.completion_date || 'Date'}\n\n`;
    });
  }

  return resume;
};