
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen } from 'lucide-react';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
    className?: string; // For explicit width or alignment (e.g. 'text-right')
}

interface DataTableProps<T> {
    title?: string;
    description?: string;
    data: T[];
    columns: Column<T>[];
    keyExtractor: (row: T) => string;
    emptyState?: {
        message: string;
        subMessage?: string;
        action?: React.ReactNode;
    };
    isLoading?: boolean;
}

export function DataTable<T>({
    title,
    description,
    data,
    columns,
    keyExtractor,
    emptyState,
    isLoading
}: DataTableProps<T>) {

    if (isLoading) {
        return (
            <Card className="border border-gray-200 rounded-lg">
                {title && (
                    <CardHeader className="pb-1">
                        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
                        {description && <CardDescription className="text-gray-600">{description}</CardDescription>}
                    </CardHeader>
                )}
                <CardContent className="p-12 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                </CardContent>
            </Card>
        );
    }

    // Empty State
    if (data.length === 0 && emptyState) {
        return (
            <Card className="border border-gray-200 rounded-lg">
                {title && (
                    <CardHeader className="pb-1">
                        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
                        {description && <CardDescription className="text-gray-600">{description}</CardDescription>}
                    </CardHeader>
                )}
                <CardContent className="pt-0 px-0 pb-0 p-5">
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200 border-dashed m-5">
                        <div className="mx-auto h-12 w-12 text-gray-300 mb-3 flex items-center justify-center rounded-full bg-white">
                            <FolderOpen className="h-6 w-6" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">{emptyState.message}</h3>
                        <p className="mt-1 text-sm text-gray-500">{emptyState.subMessage}</p>
                        {emptyState.action && <div className="mt-6">{emptyState.action}</div>}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-gray-200 rounded-lg">
            {(title || description) && (
                <CardHeader className="pb-1">
                    {title && <CardTitle className="text-2xl font-semibold">{title}</CardTitle>}
                    {description && <CardDescription className="text-gray-600">{description}</CardDescription>}
                </CardHeader>
            )}

            <CardContent className="pt-0 px-0 pb-0 p-5">
                <div className="rounded-lg overflow-hidden border border-gray-200">
                    <Table className="border border-gray-200 rounded-lg">
                        <TableHeader>
                            <TableRow className="border border-gray-200 bg-white">
                                {columns.map((col, index) => (
                                    <TableHead key={index} className={`font-semibold text-gray-700 ${col.className || ''}`}>
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row) => (
                                <TableRow className="border border-gray-200 hover:bg-white transition-colors" key={keyExtractor(row)}>
                                    {columns.map((col, index) => (
                                        <TableCell key={index} className={col.className}>
                                            {col.cell
                                                ? col.cell(row)
                                                : (col.accessorKey ? String(row[col.accessorKey]) : '')}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
