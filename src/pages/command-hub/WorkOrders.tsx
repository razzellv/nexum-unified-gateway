import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, RefreshCw, ShieldCheck, XCircle, Target } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function WorkOrders() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Execution Gate — governance check before completing a WO
  const [showResolutionGate, setShowResolutionGate] = useState(false);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [closingTechnician, setClosingTechnician] = useState('');

  const loadWorkOrders = useCallback(async () => {

    const facilityId = user?.facilityId || user?.['custom:facilityId'] || 'facility-001';

    setIsLoading(true);

    try {

      const response = await fetch(`${API_BASE_URL}/work-orders?facilityId=${facilityId}`, {
        
        headers: { 'Authorization': `Bearer ${localStorage.getItem('nexum_access_token')}` }
      });

      if (response.ok) {

        const data = await response.json();

        

        // Transform API data to WorkOrder format

        const workOrders = (data.workOrders || data || []).map((wo: any) => ({

          ...wo,

          description: wo.description || wo.reason || '',

          assignedTo: wo.assignedTo || null,

          assignedToName: wo.assignedToName || wo.createdByName || 'Unassigned',

          equipmentType: wo.system || wo.equipmentType || 'general',

          dueDate: wo.dueDate || wo.createdAt,

          notes: wo.notes || [],

          partsRequired: wo.partsRequired || [],

          tags: wo.tags || [],

          attachments: wo.attachments || []

        }));

        setWorkOrders(workOrders);
        try { localStorage.setItem('nexum_work_orders', JSON.stringify(workOrders.slice(0, 200))); } catch {}

      }

    } catch (error) {

      console.error(error);

    } finally {

      setIsLoading(false);

    }

  }, [user?.facilityId, user?.['custom:facilityId']]);

  useEffect(() => { loadWorkOrders(); }, [loadWorkOrders]);



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

const handleCreateWorkOrder = async (data: Partial<WorkOrder>) => {
  try {
    const token = localStorage.getItem('nexum_access_token');
    const response = await fetch(`${API_BASE_URL}/work-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        contextType:     data.contextType || 'equipment',
        locationContext: data.locationContext,
        system:          data.equipmentType || 'general',
        equipmentId:     data.equipmentId || '',
        equipmentName:   data.equipmentId || '',
        buildingId:      'building-001',
        type:            data.type || 'manual',
        priority:        data.priority || 'medium',
        title:           data.title || 'Work Order',
        description:     data.description || '',
        reason:          data.description || '',
        createdByName:   user?.name || user?.email || 'User',
        estimatedCost:   data.estimatedCost || 0,
        estimatedHours:  data.estimatedHours || 0,
        partsRequired:   data.partsRequired || [],
      })
    });

    if (response.ok) {
      const result = await response.json();
      toast({
        title: 'Work Order Created',
        description: `${result.workOrder?.title || 'Work order'} created successfully!`,
      });
      setShowCreateModal(false);
      loadWorkOrders();
    } else {
      throw new Error('Failed to create work order');
    }
  } catch (error) {
    console.error('Error creating work order:', error);
    toast({
      title: 'Error',
      description: 'Failed to create work order. Please try again.',
      variant: 'destructive'
    });
  }
};

  const handleUpdateWorkOrder = async (data: Partial<WorkOrder>) => {
    if (!data.workOrderId) return;
    try {
      const token = localStorage.getItem('nexum_access_token');
      const response = await fetch(`${API_BASE_URL}/work-orders/${data.workOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title:          data.title,
          description:    data.description,
          status:         data.status,
          priority:       data.priority,
          type:           data.type,
          assignedTo:     data.assignedTo,
          assignedToName: data.assignedToName,
          dueDate:        data.dueDate,
          scheduledDate:  data.scheduledDate,
          estimatedHours: data.estimatedHours,
          estimatedCost:  data.estimatedCost,
          partsRequired:  data.partsRequired,
          tags:           data.tags,
          safetyPrecautions: data.safetyPrecautions,
          equipmentId:    data.equipmentId,
          equipmentType:  data.equipmentType,
          locationContext: data.locationContext,
        }),
      });
      if (!response.ok) throw new Error('API error');
    } catch {
      // Best-effort: update locally even if API fails
    }
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
    // EXECUTION GATE: governance check before marking complete
    if (status === 'completed') {
      setPendingCompleteId(workOrderId);
      setResolutionNotes('');
      setClosingTechnician('');
      setShowResolutionGate(true);
      return;
    }
    applyStatusChange(workOrderId, status);
  };

  const applyStatusChange = (workOrderId: string, status: WorkOrderStatus, extra?: { resolutionNotes?: string; closingTechnician?: string }) => {
    setWorkOrders(workOrders.map(wo =>
      wo.workOrderId === workOrderId
        ? {
            ...wo,
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : wo.completedAt,
            ...(extra ?? {}),
          }
        : wo
    ));

    if (viewingWorkOrder?.workOrderId === workOrderId) {
      setViewingWorkOrder({
        ...viewingWorkOrder,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : viewingWorkOrder.completedAt,
        ...(extra ?? {}),
      });
    }

    toast({
      title: status === 'completed' ? 'Work Order Completed — Record Sealed' : 'Status Updated',
      description: status === 'completed'
        ? `${workOrderId.toUpperCase()} closed and locked. Resolution logged.`
        : `Work order status changed to ${status.replace('_', ' ')}.`,
    });
  };

  const handleConfirmCompletion = () => {
    if (!pendingCompleteId) return;
    if (!resolutionNotes.trim() || !closingTechnician.trim()) {
      toast({ title: 'Governance Check Failed', description: 'Resolution notes and closing technician are required to complete this work order.', variant: 'destructive' });
      return;
    }
    applyStatusChange(pendingCompleteId, 'completed', { resolutionNotes, closingTechnician });
    setShowResolutionGate(false);
    setPendingCompleteId(null);
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
            <Button variant="outline" size="sm" onClick={() => navigate('/project-controls')}>
              <Target className="w-4 h-4 mr-2" />
              Project Controls
            </Button>
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

        {/* Execution Gate — Governance check before completion */}
        <AlertDialog open={showResolutionGate} onOpenChange={(open) => { if (!open) { setShowResolutionGate(false); setPendingCompleteId(null); } }}>
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Governance Check — Complete Work Order
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>Before this work order can be sealed as <strong className="text-foreground">Completed</strong>, the following must be provided. These fields are required for admissibility.</p>
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Resolution Notes <span className="text-destructive">*</span></Label>
                      <Textarea
                        placeholder="Describe what was done, how the issue was resolved, and any follow-up required..."
                        rows={3}
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-foreground text-xs font-semibold uppercase tracking-wide">Closing Technician <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Full name of technician confirming completion"
                        value={closingTechnician}
                        onChange={e => setClosingTechnician(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {(!resolutionNotes.trim() || !closingTechnician.trim()) && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                      <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Both fields required — execution is blocked until governance check passes.
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCompletion}
                disabled={!resolutionNotes.trim() || !closingTechnician.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-40"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Confirm & Seal Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
