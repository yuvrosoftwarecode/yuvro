import React, { useState } from 'react';
import PlacementLayout from '@/components/placement/PlacementLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { usePlacementDrives } from '@/hooks/usePlacement';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { format } from 'date-fns';
import { Building2, CalendarDays } from 'lucide-react';

const statusColors: Record<string, string> = { upcoming: 'hsl(249,60%,69%)', ongoing: 'hsl(165,64%,50%)', completed: 'hsl(220,15%,60%)' };

const DriveCalendar = () => {
  const { data: drives, isLoading } = usePlacementDrives();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const driveDates = drives?.map(d => new Date(d.drive_date)) || [];
  const selectedDrives = drives?.filter(d => selectedDate && format(new Date(d.drive_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) || [];
  
  const allUpcomingDrives = drives?.filter(d => d.status !== 'completed') || [];
  const totalPages = Math.ceil(allUpcomingDrives.length / itemsPerPage);
  const currentDrives = allUpcomingDrives.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <PlacementLayout title="Drive Calendar">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm rounded-xl lg:col-span-1">
          <CardContent className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{ hasDrive: driveDates }}
              modifiersStyles={{ hasDrive: { fontWeight: 'bold', color: 'hsl(249,60%,69%)', textDecoration: 'underline' } }}
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground">
            {selectedDate ? `Drives on ${format(selectedDate, 'dd MMMM yyyy')}` : 'Select a date'}
          </h2>
          {selectedDrives.length > 0 ? selectedDrives.map(d => (
            <Card key={d.id} className="border-0 shadow-sm rounded-xl">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[hsl(249,60%,95%)] flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-[hsl(249,60%,69%)]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{d.title}</p>
                    <Badge className="text-[10px]" style={{ background: statusColors[d.status] || statusColors.upcoming, color: '#fff' }}>{d.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{d.company_name}</p>
                  {d.notes && <p className="text-xs mt-2 p-2 rounded-lg bg-[hsl(240,20%,97%)]">{d.notes}</p>}
                </div>
              </CardContent>
            </Card>
          )) : (
            <p className="text-muted-foreground text-center py-8">No drives scheduled for this date</p>
          )}

          {/* All Drives */}
          <h2 className="font-semibold text-sm text-muted-foreground pt-4">All Upcoming Drives</h2>
          {isLoading ? <p className="text-muted-foreground">Loading...</p> : !allUpcomingDrives.length ? (
            <p className="text-muted-foreground text-center py-8">No drives scheduled</p>
          ) : (
            <>
              {currentDrives.map(d => (
                <Card key={d.id} className="border-0 shadow-sm rounded-xl">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[hsl(240,20%,96%)] flex items-center justify-center">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{d.title} — {d.company_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(d.drive_date), 'dd MMM yyyy')}</p>
                    </div>
                    <Badge className="text-[10px]" style={{ background: statusColors[d.status] || statusColors.upcoming, color: '#fff' }}>{d.status}</Badge>
                  </CardContent>
                </Card>
              ))}
              
              {totalPages > 1 && (
                <div className="pt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      
                      {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink 
                            isActive={currentPage === i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PlacementLayout>
  );
};

export default DriveCalendar;
