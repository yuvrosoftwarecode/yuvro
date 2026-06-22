import re

def process_file(src_path, dest_path):
    with open(src_path, 'r') as f:
        content = f.read()
    
    # Replace layout imports
    content = re.sub(r"import DashboardLayout from '@/components/common/DashboardLayout';", 
                     "import { SidebarProvider } from '@/components/ui/sidebar';\nimport { AdminSidebar } from '@/components/admin/AdminSidebar';", 
                     content)
    
    # Replace layout usage
    content = re.sub(r"<DashboardLayout[^>]*>", 
                     '<SidebarProvider><div className="flex h-screen overflow-hidden w-full"><AdminSidebar /><div className="flex-1 overflow-auto">', 
                     content)
    content = re.sub(r"</DashboardLayout>", "</div></div></SidebarProvider>", content)
    
    # Replace back routing in report view
    if 'MockInterviewReportView' in dest_path:
        content = re.sub(r"navigate\('/instructor/mock-interview'\);", "navigate('/admin/mock-interview');", content)
    
    with open(dest_path, 'w') as f:
        f.write(content)

process_file('ycode-web/src/pages/instructor/MockInterview.tsx', 'ycampus-web/src/pages/admin/MockInterview.tsx')
process_file('ycode-web/src/pages/instructor/MockInterviewAnalytics.tsx', 'ycampus-web/src/pages/admin/MockInterviewAnalytics.tsx')
process_file('ycode-web/src/pages/instructor/MockInterviewReportView.tsx', 'ycampus-web/src/pages/admin/MockInterviewReportView.tsx')
process_file('ycode-web/src/pages/instructor/MockInterviewReports.tsx', 'ycampus-web/src/pages/admin/MockInterviewReports.tsx')

print("UI files copied and layouts replaced.")
