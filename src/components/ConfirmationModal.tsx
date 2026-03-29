import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, Shield, Rocket } from 'lucide-react';

type ConfirmVariant = 'approve' | 'reject' | 'restore' | 'approveAll' | 'publish';

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: ConfirmVariant;
  title: string;
  description: string;
  itemLabel?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}

const variantConfig: Record<ConfirmVariant, {
  icon: React.ElementType;
  iconClass: string;
  ringClass: string;
  confirmClass: string;
}> = {
  approve: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    ringClass: 'ring-emerald-500/20 bg-emerald-500/10',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-0',
  },
  reject: {
    icon: XCircle,
    iconClass: 'text-destructive',
    ringClass: 'ring-destructive/20 bg-destructive/10',
    confirmClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0',
  },
  restore: {
    icon: RotateCcw,
    iconClass: 'text-amber-500',
    ringClass: 'ring-amber-500/20 bg-amber-500/10',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white border-0',
  },
  approveAll: {
    icon: Shield,
    iconClass: 'text-primary',
    ringClass: 'ring-primary/20 bg-primary/10',
    confirmClass: 'gold-gradient text-primary-foreground border-0 hover:opacity-90',
  },
  publish: {
    icon: Rocket,
    iconClass: 'text-primary',
    ringClass: 'ring-primary/20 bg-primary/10',
    confirmClass: 'gold-gradient text-primary-foreground border-0 hover:opacity-90',
  },
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  onOpenChange,
  variant,
  title,
  description,
  itemLabel,
  confirmLabel,
  cancelLabel,
  onConfirm,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md border-border/50 shadow-2xl">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`h-14 w-14 rounded-full ring-4 ${config.ringClass} flex items-center justify-center mx-auto mb-2`}
          >
            <Icon className={`h-7 w-7 ${config.iconClass}`} />
          </motion.div>
          <AlertDialogTitle className="text-lg font-display font-semibold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {description}
            {itemLabel && (
              <span className="block mt-2 px-3 py-1.5 bg-muted/50 rounded-md text-xs font-mono text-foreground/80 border border-border/50">
                {itemLabel}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-3 mt-2">
          <AlertDialogCancel className="min-w-[100px]">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`min-w-[100px] ${config.confirmClass}`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmationModal;
