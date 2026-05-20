import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav>
      <Link className="nav-logo" href="/"><Image src="/logo.svg" alt="Bonsight" width={100} height={50} /></Link>
      <div className="nav-links">
        <Link href="/">Inicio</Link>

        <div className="nav-dropdown">
          <a>Growth ▾</a>
          <div className="nav-dropdown-menu">
            <Link href="/services/data-strategy"><span className="menu-icon">⬡</span> Data Strategy</Link>
            <Link href="/services/growth"><span className="menu-icon">↗</span> Growth Digital</Link>
            <Link href="/services/cro"><span className="menu-icon">◎</span> CRO</Link>
          </div>
        </div>

        <div className="nav-dropdown">
          <a>Boost ▾</a>
          <div className="nav-dropdown-menu">
            <Link href="/services/mentoring"><span className="menu-icon">◈</span> Mentoring</Link>
            <Link href="/services/procesos"><span className="menu-icon">⟳</span> Mejora de Procesos</Link>
            <Link href="/services/liderazgo"><span className="menu-icon">◇</span> Soporte a Líderes</Link>
          </div>
        </div>

        <Link className="nav-cta" href="/#contacto">Conversemos</Link>
      </div>
    </nav>
  );
}
