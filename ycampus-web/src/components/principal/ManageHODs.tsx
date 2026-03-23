import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus, ArrowUpCircle } from 'lucide-react';
import AddHODDialog from '@/components/principal/AddHODDialog';
import PromoteFacultyDialog from '@/components/principal/PromoteFacultyDialog';

const initialHods = [
  {
    id: 1,
    name: 'Dr. Rajesh Kumar',
    department: 'CSE',
    email: 'rajesh.kumar@yuvro.edu',
  },
  {
    id: 2,
    name: 'Dr. Priya Sharma',
    department: 'ECE',
    email: 'priya.sharma@yuvro.edu',
  },
];

export default function ManageHODs() {
  const [hods] = useState(initialHods);
  const [addOpen, setAddOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Manage HODs</h2>
          <p className="text-sm text-muted-foreground">
            Add new HODs or promote faculty members as department heads
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add HOD
          </Button>
          <Button variant="outline" onClick={() => setPromoteOpen(true)} className="gap-2">
            <ArrowUpCircle className="h-4 w-4" />
            Promote Faculty
          </Button>
        </div>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle>Current HODs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hods.map((hod) => (
              <div
                key={hod.id}
                className="rounded-lg border p-4 bg-background"
              >
                <h3 className="font-semibold">{hod.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{hod.department}</p>
                <p className="text-sm text-muted-foreground">{hod.email}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddHODDialog open={addOpen} onOpenChange={setAddOpen} />
      <PromoteFacultyDialog open={promoteOpen} onOpenChange={setPromoteOpen} />
    </div>
  );
}