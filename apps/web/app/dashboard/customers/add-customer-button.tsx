'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Dialog, DialogContent, TextField } from '@mui/material';
import { apiPost } from '@/lib/api';

export function AddCustomerButton({ locationId }: { locationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setOpen(false);
    setTimeout(() => {
      setEmail('');
      setName('');
      setPhone('');
      setError(null);
    }, 200);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/customers', {
        locationId,
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setOpen(false);
      setTimeout(() => {
        setEmail('');
        setName('');
        setPhone('');
      }, 200);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="contained" onClick={() => setOpen(true)}>
        Add customer
      </Button>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogContent sx={{ p: { xs: 3, sm: 5 } }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                New customer
              </p>
              <h2 className="text-xl font-semibold tracking-tight text-ink">Add a customer</h2>
              <p className="text-sm leading-relaxed text-muted">
                One person to send review requests to. Email is required.
              </p>
            </div>
            <TextField
              label="Email"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              autoFocus
              disabled={submitting}
            />
            <TextField
              label="Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              disabled={submitting}
            />
            <TextField
              label="Phone"
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              disabled={submitting}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <div className="flex items-center justify-between gap-3">
              <Button variant="text" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || email.trim().length === 0}
              >
                {submitting ? 'Adding…' : 'Add customer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
