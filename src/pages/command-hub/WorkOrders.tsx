import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { WorkOrderStats } from '@/components/command-hub/workorders/WorkOrderStats';
import { WorkOrderFilters } from '@/components/command-hub/workorders/WorkOrderFilters';
import { WorkOrderCard } from '@/components/command-hub/workorders/WorkOrderCard';
import { WorkOrderTable } from '@/components/command-hub/workorders/WorkOrderTable';
import { WorkOrderModal } from '@/components/command-hub/workorders/WorkOrderModal';
import { WorkOrderDetail } from '@/components/command-hub/workorders/WorkOrderDetail';
import { getWorkOrderStats } from '@/data/command-hub/workOrderData';
import { WorkOrder, WorkOrderFilters as FilterType, WorkOrderStatus } from '@/types/command-hub/workOrder';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function WorkOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterType>({
    search: '',
    status: 'all',
    priority: 'all',
    type: 'all',
    equipmentType: 'all',
    assignedTo: 'all',
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrder | null>(null);
  const [viewingWorkOrder, setViewingWorkOrder] = useState<WorkOrder | null>(null);
  const [deletingWorkOrder, setDeletingWorkOrder] = useState<WorkOrder | null>(null);

  // Load work orders from API

  const loadWorkOrders = useCallback(async () => {

    if (!user?.facilityId) {

      console.log('⏳ Waiting for facilityId...');

      return;

    }

    setIsLoading(true);

    try {

      const response = await fetch(

        ${API_BASE_URL}/work-orders?facilityId=${user.facilityId},

        {

          headers: {

            'Authorization': Bearer ${localStorage.getItem('nexum_access_token')}

          }

        }

      );

      if (response.ok) {

        const data = await response.json();

        console.log('✅ Work orders loaded:', data);

        setWorkOrders(data.workOrders || data || []);

      } else {

        console.warn('⚠️ API returned error, using empty array');

        setWorkOrders([]);

      }

    } catch (error) {

      console.error('❌ Error loading work orders:', error);

      setWorkOrders([]);

    } finally {

      setIsLoading(false);

    }

  }, [user?.facilityId]);

  useEffect(() => {

    loadWorkOrders();

  }, [loadWorkOrders]);


  // Filter work orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          wo.workOrderId.toLowerCase().includes(searchLower) ||
          wo.title.toLowerCase().includes(searchLower) ||
          wo.equipmentId.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status !== 'all' && wo.status !== filters.status) return false;
      
      // Priority filter
      if (filters.priority !== 'all' && wo.priority !== filters.priority) return false;
      
      // Type filter
      if (filters.type !== 'all' && wo.type !== filters.type) return false;
      
      // Equipment type filter
      if (filters.equipmentType !== 'all' && wo.equipmentType !== filters.equipmentType) return false;
      
      // Assigned to filter
      if (filters.assignedTo === 'unassigned' && wo.assignedTo) return false;
      if (filters.assignedTo !== 'all' && filters.assignedTo !== 'unassigned' && wo.assignedTo !== filters.assignedTo) return false;
      
      return true;
    });
  }, [workOrders, filters]);

  // Calculate stats
  const stats = useMemo(() => getWorkOrderStats(workOrders), [workOrders]);

  // Count open work orders for subtitle
  const openCount = workOrders.filter(wo => 
    ['open', 'assigned', 'in_progress', 'on_hold'].includes(wo.status)
  ).length;

  // Handlers
  const handleCreateWorkOrder = (data: Partial<WorkOrder>) => {
    const newWorkOrder: WorkOrder = {
      workOrderId: `wo-2026-${String(workOrders.length + 1).padStart(3, '0')}`,
      facilityId: 'facility-001',
      orgId: 'org-demo-001',
      equipmentId: data.equipmentId || '',
      equipmentType: data.equipmentType || 'hvac',
      type: data.type || 'corrective',
      priority: data.priority || 'normal',
      status: 'open',
      title: data.title || '',
      description: data.description || '',
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      createdBy: 'current-user',
      createdByName: 'Current User',
      createdAt: new Date().toISOString(),
      dueDate: data.dueDate || new Date().toISOString(),
      scheduledDate: data.scheduledDate,
      estimatedHours: data.estimatedHours,
      partsRequired: data.partsRequired || [],
      estimatedCost: data.estimatedCost,
      tags: data.tags || [],
      attachments: [],
      notes: [],
      safetyPrecautions: data.safetyPrecautions,
      violationId: data.violationId,
    };

    setWorkOrders([newWorkOrder, ...workOrders]);
    toast({
      title: 'Work Order Created',
      description: `${newWorkOrder.workOrderId.toUpperCase()} has been created successfully.`,
    });
  };

  const handleUpdateWorkOrder = (data: Partial<WorkOrder>) => {
    if (!data.workOrderId) return;
    
    setWorkOrders(workOrders.map(wo => 
      wo.workOrderId === data.workOrderId ? { ...wo, ...data } : wo
    ));
    setEditingWorkOrder(null);
    
    toast({
      title: 'Work Order Updated',
      description: `${data.workOrderId.toUpperCase()} has been updated.`,
    });
  };

  const handleDeleteWorkOrder = () => {
    if (!deletingWorkOrder) return;
    
    setWorkOrders(workOrders.filter(wo => wo.workOrderId !== deletingWorkOrder.workOrderId));
    setDeletingWorkOrder(null);
    
    toast({
      title: 'Work Order Deleted',
      description: `${deletingWorkOrder.workOrderId.toUpperCase()} has been deleted.`,
    });
  };

  const handleDuplicateWorkOrder = (workOrder: WorkOrder) => {
    const duplicate: WorkOrder = {
      ...workOrder,
      workOrderId: `wo-2026-${String(workOrders.length + 1).padStart(3, '0')}`,
      status: 'open',
      createdAt: new Date().toISOString(),
      completedAt: undefined,
      actualHours: undefined,
      actualCost: undefined,
      notes: [],
      attachments: [],
    };
    
    setWorkOrders([duplicate, ...workOrders]);
    toast({
      title: 'Work Order Duplicated',
      description: `Created ${duplicate.workOrderId.toUpperCase()} from ${workOrder.workOrderId.toUpperCase()}.`,
    });
  };

  const handleStatusChange = (workOrderId: string, status: WorkOrderStatus) => {
    setWorkOrders(workOrders.map(wo => 
      wo.workOrderId === workOrderId 
        ? { 
            ...wo, 
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : wo.completedAt 
          } 
        : wo
    ));
    
    // Update viewing work order if it's the one being changed
    if (viewingWorkOrder?.workOrderId === workOrderId) {
      setViewingWorkOrder({
        ...viewingWorkOrder,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : viewingWorkOrder.completedAt
      });
    }

    toast({
      title: 'Status Updated',
      description: `Work order status changed to ${status.replace('_', ' ')}.`,
    });
  };

  const handleAddNote = (workOrderId: string, content: string) => {
    const newNote = {
      id: `note-${Date.now()}`,
      content,
      author: 'current-user',
      authorName: 'Current User',
      createdAt: new Date().toISOString(),
    };

    setWorkOrders(workOrders.map(wo => 
      wo.workOrderId === workOrderId 
        ? { ...wo, notes: [...wo.notes, newNote] } 
        : wo
    ));

    // Update viewing work order
    if (viewingWorkOrder?.workOrderId === workOrderId) {
      setViewingWorkOrder({
        ...viewingWorkOrder,
        notes: [...viewingWorkOrder.notes, newNote]
      });
    }

    toast({
      title: 'Note Added',
      description: 'Your note has been added to the work order.',
    });
  };

  const handleBulkDelete = () => {
    setWorkOrders(workOrders.filter(wo => !selectedIds.includes(wo.workOrderId)));
    setSelectedIds([]);
    toast({
      title: 'Work Orders Deleted',
      description: `${selectedIds.length} work orders have been deleted.`,
    });
  };

  const handleRefresh = () => {
    // TODO: Replace with actual API call
    toast({
      title: 'Refreshing',
      description: 'Fetching latest work orders from server...',
    });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Work Orders</h1>
            <p className="text-muted-foreground">
              {openCount} open work orders • {stats.overdue > 0 && (
                <span className="text-critical">{stats.overdue} overdue</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Work Order
            </Button>
          </div>
        </div>

        {/* Stats */}
        <WorkOrderStats {...stats} />

        {/* Filters */}
        <WorkOrderFilters
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Work Orders List */}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWorkOrders.map((workOrder) => (
              <WorkOrderCard
                key={workOrder.workOrderId}
                workOrder={workOrder}
                onView={setViewingWorkOrder}
                onEdit={setEditingWorkOrder}
                onDelete={setDeletingWorkOrder}
                onDuplicate={handleDuplicateWorkOrder}
              />
            ))}
            {filteredWorkOrders.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No work orders found matching your criteria
              </div>
            )}
          </div>
        ) : (
          <WorkOrderTable
            workOrders={filteredWorkOrders}
            selectedIds={selectedIds}
            onSelectChange={setSelectedIds}
            onView={setViewingWorkOrder}
            onEdit={setEditingWorkOrder}
            onDelete={setDeletingWorkOrder}
            onDuplicate={handleDuplicateWorkOrder}
          />
        )}

        {/* Create Modal */}
        <WorkOrderModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSave={handleCreateWorkOrder}
        />

        {/* Edit Modal */}
        <WorkOrderModal
          open={!!editingWorkOrder}
          onOpenChange={(open) => !open && setEditingWorkOrder(null)}
          workOrder={editingWorkOrder}
          onSave={handleUpdateWorkOrder}
        />

        {/* Detail View */}
        <WorkOrderDetail
          workOrder={viewingWorkOrder}
          open={!!viewingWorkOrder}
          onOpenChange={(open) => !open && setViewingWorkOrder(null)}
          onEdit={(wo) => { setViewingWorkOrder(null); setEditingWorkOrder(wo); }}
          onStatusChange={handleStatusChange}
          onAddNote={handleAddNote}
          onDuplicate={(wo) => { setViewingWorkOrder(null); handleDuplicateWorkOrder(wo); }}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deletingWorkOrder} onOpenChange={(open) => !open && setDeletingWorkOrder(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete work order {deletingWorkOrder?.workOrderId.toUpperCase()}? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteWorkOrder}
                className="bg-critical text-critical-foreground hover:bg-critical/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
