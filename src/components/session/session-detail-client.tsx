'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatDate, formatTime, isRegistrationOpen } from '@/lib/utils/date';
import { formatVND } from '@/lib/utils/money';
import { registerForSession, cancelRegistration } from '@/services/registration.service';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { SessionWithDetails } from '@/types';
import {
  CalendarDays, Clock, MapPin, Users, ArrowLeft,
  CheckCircle2, XCircle, AlertCircle, Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface Props {
  session: SessionWithDetails;
  currentUserId: string;
}

export function SessionDetailClient({ session, currentUserId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const activeRegs = session.registrations.filter((r) => r.status !== 'CANCELLED');
  const userReg = session.registrations.find(
    (r) => r.profiles?.id === currentUserId && r.status !== 'CANCELLED'
  );
  const isRegistered = !!userReg;
  const regOpen = isRegistrationOpen(session.registration_open_at, session.registration_close_at);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const result = await registerForSession(session.id);
      if (result.success) {
        toast.success('Registered successfully!');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to register');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setLoading(true);
    try {
      const result = await cancelRegistration(session.id, cancelReason);
      if (result.success) {
        toast.success('Registration cancelled');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to cancel');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
      setCancelOpen(false);
      setCancelReason('');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'ATTENDED': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'ABSENT': case 'NO_SHOW': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/schedule" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Quay lại Lịch thi đấu
      </Link>

      {/* Session Header */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={session.status === 'FINALIZED' ? 'default' : session.status === 'CANCELLED' ? 'destructive' : 'secondary'} className="text-xs">
            {session.status.replace('_', ' ')}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold mt-3 mb-4">Badminton Session</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium text-sm">{formatDate(session.date)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-medium text-sm">{formatTime(session.start_time)} - {formatTime(session.end_time)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Court</p>
              <p className="font-medium text-sm">{session.court_name || 'TBD'}</p>
            </div>
          </div>
        </div>

        {/* Registration Action */}
        {session.status !== 'CANCELLED' && session.status !== 'FINALIZED' && (
          <div className="mt-6">
            {isRegistered ? (
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                  ✓ You are registered
                </Badge>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setCancelOpen(true)}>
                  Cancel
                </Button>
              </div>
            ) : regOpen ? (
              <Button onClick={handleRegister} disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Register for this Session
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Registration is currently closed.</p>
            )}
          </div>
        )}
      </Card>

      {/* Players List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Players ({activeRegs.length})
          </h2>
        </div>

        {activeRegs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No one has registered yet.
          </p>
        ) : (
          <div className="space-y-2">
            {activeRegs.map((reg) => {
              const initials = reg.profiles.full_name
                .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <div key={reg.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={reg.profiles.avatar_url || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{reg.profiles.full_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {reg.sets_played > 0 && (
                      <span className="text-xs text-muted-foreground">{reg.sets_played} sets</span>
                    )}
                    {statusIcon(reg.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Cost Breakdown (if finalized) */}
      {session.session_costs && session.status === 'FINALIZED' && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Cost Breakdown</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Court</p>
              <p className="font-medium">{formatVND(session.session_costs.court_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Shuttlecock</p>
              <p className="font-medium">{formatVND(session.session_costs.shuttlecock_cost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Other</p>
              <p className="font-medium">{formatVND(session.session_costs.other_cost)}</p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold text-primary">{formatVND(session.session_costs.total_cost)}</span>
          </div>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Registration</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Why are you cancelling?"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancel Registration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
