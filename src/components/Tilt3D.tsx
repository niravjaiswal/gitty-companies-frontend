import { useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Tilt3DProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. Default: 10 */
  intensity?: number;
  /** Extra Z lift on hover in px. Default: 6 */
  lift?: number;
}

/**
 * Wraps children in a perspective container that tilts toward the mouse cursor.
 * Includes a reactive radial glow that follows the cursor.
 */
export default function Tilt3D({ children, className, intensity = 10, lift = 6 }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 → 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;   // -0.5 → 0.5
    const rotY = x * intensity * 2;
    const rotX = -y * intensity;

    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${lift}px)`;

    // Update glow position via CSS custom property
    const glow = el.querySelector<HTMLElement>('.tilt-3d-glow');
    if (glow) {
      const mx = ((e.clientX - rect.left) / rect.width) * 100;
      const my = ((e.clientY - rect.top) / rect.height) * 100;
      glow.style.setProperty('--mx', `${mx}%`);
      glow.style.setProperty('--my', `${my}%`);
    }
  }

  function handleMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
  }

  return (
    <div
      ref={ref}
      className={cn('tilt-3d', className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tilt-3d-glow" />
      {children}
    </div>
  );
}
