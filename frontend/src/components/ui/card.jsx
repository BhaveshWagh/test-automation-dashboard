import { cn } from '@/lib/utils';

function Card({ className, ...props }) {
  return <div className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)} {...props} />;
}

function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 p-5', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <div className={cn('text-sm font-semibold leading-none', className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function CardAction({ className, ...props }) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
