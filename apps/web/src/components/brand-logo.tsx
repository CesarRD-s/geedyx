import Image from 'next/image';
import logoDark from '../assets/geedyx-logo-horizontal-dark.png';
import logoLight from '../assets/geedyx-logo-horizontal-light.png';

export function BrandLogo() {
  return (
    <span className="inline-flex items-center">
      <Image
        src={logoLight}
        alt="Geedyx"
        priority
        className="h-auto w-36 dark:hidden"
      />
      <Image
        src={logoDark}
        alt="Geedyx"
        priority
        className="hidden h-auto w-36 dark:block"
      />
    </span>
  );
}
