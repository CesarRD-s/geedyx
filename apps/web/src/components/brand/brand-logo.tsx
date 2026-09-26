import Image from 'next/image';
import logoForDarkTheme from '../../assets/geedyx-logo-horizontal-dark.png';
import logoForLightTheme from '../../assets/geedyx-logo-horizontal-light.png';
import { cn } from '../../lib/cn';

export function BrandLogo() {
  return (
    <span className={cn(['inline-flex items-center'])}>
      <Image
        src={logoForLightTheme}
        alt="Geedyx"
        priority
        className={cn(['h-auto w-36', 'dark:hidden'])}
      />
      <Image
        src={logoForDarkTheme}
        alt="Geedyx"
        priority
        className={cn(['hidden h-auto w-36', 'dark:block'])}
      />
    </span>
  );
}
