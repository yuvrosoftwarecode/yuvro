import { SidebarProvider } from '@/components/ui/sidebar';
import { HODSidebar } from '@/components/hod/HODSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Faculty = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <HODSidebar />
        <div className="flex-1 flex flex-col">
<main className="flex-1 p-6 bg-background">
            <h1 className="text-2xl font-bold mb-6">Faculty Management</h1>
            <Card>
              <CardHeader>
                <CardTitle>Department Faculty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Faculty management coming soon...</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Faculty;
