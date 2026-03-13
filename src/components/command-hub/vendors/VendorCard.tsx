import { Phone, Mail, Star, FileText, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vendor } from '@/pages/command-hub/Vendors';

interface VendorCardProps {
  vendor: Vendor;
  onAssignProject?: () => void;
  onViewContracts?: () => void;
  onDelete?: () => void;
}

export function VendorCard({ vendor, onAssignProject, onViewContracts, onDelete }: VendorCardProps) {
  const insuranceExpiring = vendor.insuranceExpiry &&
    new Date(vendor.insuranceExpiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <div className="glass-panel p-4 md:p-5 transition-all duration-200 hover:border-primary/50">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="text-base md:text-lg font-semibold truncate">{vendor.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{vendor.contactName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 shrink-0">
          {vendor.onCall && (
            <Badge className="bg-success/20 text-success border-success/30 text-xs">
              On Call
            </Badge>
          )}
          {insuranceExpiring && (
            <Badge variant="outline" className="border-warning/50 text-warning text-xs">
              <AlertCircle className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Insurance </span>Expiring
            </Badge>
          )}
        </div>
      </div>

      {/* Specialties */}
      <div className="flex flex-wrap gap-1 mb-4">
        {vendor.specialty?.slice(0, 3).map((spec) => (
          <Badge key={spec} variant="outline" className="capitalize text-xs">
            {spec}
          </Badge>
        ))}
        {vendor.specialty?.length > 3 && (
          <Badge variant="outline" className="text-xs">+{vendor.specialty.length - 3}</Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 py-3 border-y border-border/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-warning mb-1">
            <Star className="w-3 md:w-4 h-3 md:h-4 fill-warning" />
            <span className="font-semibold text-sm md:text-base">
              {vendor.responseTimeRating?.toFixed(1) || '—'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Rating</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground text-sm md:text-base">{vendor.activeContracts ?? 0}</p>
          <p className="text-xs text-muted-foreground">Contracts</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground text-sm md:text-base">
            ${((vendor.totalSpend || 0) / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-muted-foreground">Spend</p>
        </div>
      </div>

      {/* Contact */}
      <div className="space-y-2 mb-4">
        {vendor.email && (
          <a
            href={`mailto:${vendor.email}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span className="truncate">{vendor.email}</span>
          </a>
        )}
        {vendor.phone && (
          <a
            href={`tel:${vendor.phone}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Phone className="w-4 h-4 shrink-0" />
            {vendor.phone}
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onViewContracts}>
          <FileText className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Contracts</span>
        </Button>
        <Button size="sm" className="flex-1" onClick={onAssignProject}>
          <span className="hidden sm:inline">Assign Project</span>
          <span className="sm:hidden">Assign</span>
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
