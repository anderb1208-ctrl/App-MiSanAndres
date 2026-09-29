/* Consolidated from MiSanAndrés Design System ui_kits/app — Splash/Login/Registro/Home/Explorar/
   Recomendaciones/Detalle/Mapa/Perfil/Preferencias, plus an added Estados (app states) screen. */

window.MSA_DATA = (() => {
  const I = 'assets/images/';
  const destinos = [
    { id: 'johnny', name: 'Johnny Cay', category: 'Playa', cats: ['Playas', 'Familia'], location: 'Parque Regional · Norte', image: I + 'johnny-cay.jpg', hero: I + 'johnny-cay-hero.jpg', occupancy: 25, capacity: 'Aforo estimado: 120 de 480 personas', distance: '1,8 km en lancha', hours: '8:00 – 16:00', match: 96,
      desc: 'Pequeño islote ubicado frente a San Andrés, con playas de arena blanca y mar cristalino. Ideal para relajarse y disfrutar del paisaje.',
      features: [['wc', 'Baños'], ['restaurant', 'Restaurantes'], ['scuba_diving', 'Snorkel'], ['directions_boat', 'Acceso en lancha']],
      history: [10, 18, 25, 40, 58, 64, 52, 35, 20], note: 'Ocupación ideal para relajarse', reasons: ['Playas', 'Ocupación baja'], pin: { top: '30%', left: '64%' } },
    { id: 'acuario', name: 'Acuario San Andrés', category: 'Atractivo turístico', cats: ['Playas', 'Aventura', 'Familia'], location: 'Haynes Cay', image: I + 'acuario.jpg', hero: I + 'acuario.jpg', occupancy: 55, capacity: 'Aforo estimado: 260 de 470 personas', distance: '3,2 km en lancha', hours: '8:30 – 15:30', match: 88,
      desc: 'Banco de arena de aguas poco profundas entre dos cayos, donde se puede caminar en el mar y observar rayas y peces de colores.',
      features: [['scuba_diving', 'Snorkel'], ['kayaking', 'Kayak'], ['directions_boat', 'Tour en lancha']],
      history: [8, 22, 40, 55, 70, 74, 60, 42, 25], note: 'Buen momento para snorkel', reasons: ['Aventura', 'Familia'], pin: { top: '43%', left: '70%' } },
    { id: 'piscinita', name: 'La Piscinita', category: 'Atractivo natural', cats: ['Naturaleza', 'Aventura'], location: 'West View · Carretera circunvalar', image: I + 'piscinita.jpg', hero: I + 'piscinita.jpg', occupancy: 78, capacity: 'Aforo estimado: 150 de 190 personas', distance: 'A 6,1 km', hours: '9:00 – 17:00', match: 74,
      desc: 'Piscina natural formada entre rocas de coral, con aguas profundas y transparentes. Muy popular para nadar, saltar y alimentar peces.',
      features: [['pool', 'Piscina natural'], ['scuba_diving', 'Snorkel'], ['restaurant', 'Kiosco']],
      history: [15, 30, 52, 70, 82, 86, 78, 60, 40], note: 'Concurrido en este momento', reasons: ['Naturaleza'], pin: { top: '57%', left: '46%' } },
    { id: 'hoyo', name: 'Hoyo Soplador', category: 'Atractivo natural', cats: ['Naturaleza', 'Cultura'], location: 'San Luis · Sur', image: I + 'hoyo-soplador.jpg', hero: I + 'hoyo-soplador.jpg', occupancy: 34, capacity: 'Aforo estimado: 70 de 200 personas', distance: 'A 8,4 km', hours: '8:00 – 18:00', match: 81,
      desc: 'Formación rocosa en la costa sur por la que el mar expulsa chorros de agua a varios metros de altura, según la marea.',
      features: [['photo_camera', 'Mirador'], ['storefront', 'Artesanías'], ['local_parking', 'Parqueadero']],
      history: [5, 12, 20, 30, 34, 38, 30, 22, 12], note: 'Poca afluencia ahora', reasons: ['Naturaleza', 'Ocupación baja'], pin: { top: '72%', left: '43%' } },
    { id: 'westview', name: 'West View', category: 'Mirador / Buceo', cats: ['Aventura', 'Gastronomía'], location: 'Costa occidental', image: I + 'west-view.jpg', hero: I + 'west-view.jpg', occupancy: 62, capacity: 'Aforo estimado: 190 de 300 personas', distance: 'A 5,7 km', hours: '9:00 – 17:30', match: 70,
      desc: 'Plataforma sobre el mar con trampolín y tobogán, ideal para buceo superficial. Cuenta con restaurante de comida típica isleña.',
      features: [['scuba_diving', 'Buceo'], ['restaurant', 'Comida típica'], ['wc', 'Baños']],
      history: [10, 25, 45, 60, 66, 70, 62, 45, 28], note: 'Afluencia moderada', reasons: ['Aventura', 'Gastronomía'], pin: { top: '49%', left: '36%' } },
  ];
  const hours = ['08', '09', '10', '11', '12', '13', '14', '15', '16'];
  const categorias = [
    ['Playas', 'beach_access'], ['Naturaleza', 'eco'], ['Gastronomía', 'restaurant'], ['Familia', 'family_restroom'], ['Cultura', 'museum'], ['Aventura', 'kayaking'],
  ];
  return { destinos, hours, categorias, user: { name: 'Ana Martínez', first: 'Ana', email: 'ana.martinez@gmail.com', avatar: I + 'avatar-ana.jpg' }, images: I };
})();

/* ---------------- Shell ---------------- */
const { Icon: PIcon } = window.MiSanAndrSDesignSystem_cf84ac;

function StatusBar({ dark }) {
  const c = dark ? '#fff' : 'var(--text-strong)';
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 50, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 30px 0', color: c, pointerEvents: 'none', transition: 'color var(--dur-base)' }}>
      <span style={{ font: '600 16px/1 var(--font-sans)' }}>9:41</span>
      <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <PIcon name="signal_cellular_alt" size={18} fill /><PIcon name="wifi" size={18} fill /><PIcon name="battery_full" size={20} fill style={{ transform: 'rotate(90deg)' }} />
      </span>
    </div>
  );
}

function Phone({ children, darkStatus }) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 32) / 864, (window.innerWidth - 32) / 410));
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ width: 410 * scale, height: 864 * scale }}>
      <div style={{ width: 410, height: 864, transform: `scale(${scale})`, transformOrigin: 'top left', borderRadius: 58, background: '#0b0f14', padding: 10, boxShadow: '0 30px 80px rgba(0,20,48,.35)' }}>
        <div style={{ position: 'relative', width: 390, height: 844, borderRadius: 48, overflow: 'hidden', background: 'var(--surface-app)' }}>
          <StatusBar dark={darkStatus} />
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 20, background: '#000', zIndex: 101 }}></div>
          {children}
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 134, height: 5, borderRadius: 3, background: darkStatus ? 'rgba(255,255,255,.8)' : 'rgba(0,20,48,.85)', zIndex: 101 }}></div>
        </div>
      </div>
    </div>
  );
}

const ambientBg = 'radial-gradient(90% 45% at 0% 0%, rgba(179,235,255,.75) 0%, rgba(179,235,255,0) 70%), radial-gradient(80% 40% at 100% 60%, rgba(230,227,208,.8) 0%, rgba(230,227,208,0) 70%), radial-gradient(70% 35% at 10% 100%, rgba(80,217,254,.25) 0%, rgba(80,217,254,0) 70%), #f3f6f8';

function Screen({ children, bg = ambientBg, style }) {
  return <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden', ...style }}>{children}</div>;
}
function Scroll({ children, style }) {
  return <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', scrollbarWidth: 'none', ...style }}>{children}</div>;
}
function SectionHead({ title, action, onAction, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: sub ? 4 : 12 }}>
      <div>
        <h3 style={{ margin: 0, font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>{title}</h3>
        {sub && <p style={{ margin: '4px 0 12px', font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      {action && <button onClick={onAction} style={{ border: 0, background: 'none', padding: 0, marginBottom: sub ? 12 : 0, font: 'var(--type-label-bold)', fontSize: 13, color: 'var(--text-link)', cursor: 'pointer' }}>{action}</button>}
    </div>
  );
}

/* ---------------- Auth ---------------- */
const { Button: AButton, TextField: ATextField, IconButton: AIconButton, Icon: AIcon } = window.MiSanAndrSDesignSystem_cf84ac;

function SplashScreen({ onStart }) {
  const D = window.MSA_DATA;
  return (
    <Screen bg="#001430">
      <img src={D.images + 'johnny-cay-hero.jpg'} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,20,48,.35) 0%, rgba(0,20,48,0) 35%, rgba(0,20,48,.2) 55%, rgba(0,20,48,.85) 100%)' }}></div>
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 56, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <h1 style={{ margin: 0, font: '700 44px/48px var(--font-sans)', letterSpacing: '-0.03em', color: '#fff' }}>MiSanAndrés</h1>
          <p style={{ margin: '10px 0 0', font: 'var(--type-body-lg)', fontSize: 18, lineHeight: '26px', color: 'rgba(255,255,255,.9)', maxWidth: 280 }}>Descubre San Andrés Isla de forma inteligente</p>
        </div>
        <div style={{ padding: 16, borderRadius: 28, background: 'rgba(255,255,255,.14)', border: '1px solid rgba(255,255,255,.3)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10, color: '#fff', font: 'var(--type-body-md)' }}>
            <AIcon name="groups" size={20} color="var(--turq-100)" />
            <span>Recomendaciones según tus gustos y la ocupación de cada lugar en tiempo real.</span>
          </div>
          <AButton size="lg" fullWidth onClick={onStart} iconRight="arrow_forward" style={{ background: '#fff', color: 'var(--color-primary)', borderColor: '#fff' }}>Comenzar</AButton>
        </div>
      </div>
    </Screen>
  );
}

function AuthSheet({ image, children, onBack }) {
  return (
    <Screen bg="#fff">
      <img src={image} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '46%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'var(--scrim-top)' }}></div>
      {onBack && <AIconButton icon="arrow_back" tone="glass-dark" label="Volver" onClick={onBack} style={{ position: 'absolute', top: 56, left: 20, zIndex: 5 }} />}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: '34%', borderRadius: '32px 32px 0 0', background: 'rgba(255,255,255,.86)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', borderTop: '1px solid rgba(255,255,255,.9)', boxShadow: '0 -8px 24px rgba(0,20,48,.08), inset 0 1px 0 #fff', overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ padding: '28px 20px 40px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>{children}</div>
      </div>
    </Screen>
  );
}

function LoginScreen({ onLogin, onRegister }) {
  const [err, setErr] = React.useState(false);
  return (
    <AuthSheet image={window.MSA_DATA.images + 'login-beach.jpg'}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{ margin: 0, font: 'var(--type-headline-md)', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>MiSanAndrés</h1>
        <p style={{ margin: '4px 0 0', font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>Inicia sesión para continuar</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); onLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ATextField label="Correo electrónico" type="email" placeholder="ejemplo@correo.com" defaultValue="ana.martinez@gmail.com" />
        <ATextField label="Contraseña" type="password" placeholder="Ingresa tu contraseña" defaultValue="caribe2026" error={err ? 'Correo o contraseña incorrectos' : undefined} />
        <a href="#" onClick={e => e.preventDefault()} style={{ font: 'var(--type-label-md)', fontWeight: 600, paddingLeft: 4, marginBottom: 12 }}>¿Olvidaste tu contraseña?</a>
        <AButton type="submit" size="lg" fullWidth>Iniciar sesión</AButton>
        <button type="button" onClick={() => setErr(!err)} style={{ border: 0, background: 'none', padding: 0, font: 'var(--type-label-md)', color: 'var(--text-subtle)', cursor: 'pointer' }}>{err ? 'Ocultar error de ejemplo' : 'Mostrar error de ejemplo'}</button>
      </form>
      <div style={{ marginTop: 'auto', paddingTop: 28, display: 'flex', justifyContent: 'center', gap: 4, font: 'var(--type-body-md)' }}>
        <span style={{ color: 'var(--text-muted)' }}>¿No tienes cuenta?</span>
        <a href="#" onClick={e => { e.preventDefault(); onRegister(); }}>Regístrate</a>
      </div>
    </AuthSheet>
  );
}

function RegisterScreen({ onBack, onDone }) {
  const [a, setA] = React.useState(''); const [b, setB] = React.useState(''); const [terms, setTerms] = React.useState(true);
  const mismatch = b && a !== b;
  return (
    <AuthSheet image={window.MSA_DATA.images + 'west-view.jpg'} onBack={onBack}>
      <h1 style={{ margin: 0, font: 'var(--type-headline-md)', fontWeight: 700, color: 'var(--text-strong)' }}>Crear cuenta</h1>
      <p style={{ margin: '4px 0 20px', font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>Completa tus datos para comenzar</p>
      <form onSubmit={e => { e.preventDefault(); if (!mismatch) onDone(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ATextField label="Nombre completo" placeholder="Ingresa tu nombre" />
        <ATextField label="Correo electrónico" type="email" placeholder="ejemplo@correo.com" />
        <ATextField label="Contraseña" type="password" placeholder="Crea una contraseña" value={a} onChange={setA} hint="Mínimo 8 caracteres" />
        <ATextField label="Confirmar contraseña" type="password" placeholder="Confirma tu contraseña" value={b} onChange={setB} error={mismatch ? 'Las contraseñas no coinciden' : undefined} />
        <label onClick={() => setTerms(!terms)} style={{ display: 'flex', alignItems: 'center', gap: 10, font: 'var(--type-label-md)', color: 'var(--text-muted)', cursor: 'pointer', margin: '2px 0 8px' }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${terms ? 'var(--color-secondary)' : 'var(--neutral-400)'}`, background: terms ? 'var(--color-secondary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{terms && <AIcon name="check" size={16} color="#fff" />}</span>
          <span>Acepto los <a href="#" onClick={e => e.preventDefault()}>Términos y Condiciones</a></span>
        </label>
        <AButton type="submit" size="lg" fullWidth disabled={!terms}>Registrarme</AButton>
      </form>
      <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'center', gap: 4, font: 'var(--type-body-md)' }}>
        <span style={{ color: 'var(--text-muted)' }}>¿Ya tienes cuenta?</span>
        <a href="#" onClick={e => { e.preventDefault(); onBack(); }}>Inicia sesión</a>
      </div>
    </AuthSheet>
  );
}

/* ---------------- Main tabs ---------------- */
const { DestinoCard: HCard, IndicadorOcupacion: HOcc, GlassPanel: HGlass, IconButton: HIconBtn, Icon: HIcon, SearchField: HSearch, FilterChip: HChip, TopBar: HTop } = window.MiSanAndrSDesignSystem_cf84ac;
const hLevel = v => v < 40 ? 'low' : v < 70 ? 'mid' : 'high';

function HomeScreen({ go, open, favs, toggleFav }) {
  const D = window.MSA_DATA;
  const sorted = [...D.destinos].sort((a, b) => b.match - a.match);
  const low = D.destinos.filter(d => hLevel(d.occupancy) === 'low').length;
  const mid = D.destinos.filter(d => hLevel(d.occupancy) === 'mid').length;
  const high = D.destinos.length - low - mid;
  const quick = [['explorar', 'search', 'Explorar'], ['mapa', 'map', 'Mapa'], ['recomendaciones', 'auto_awesome', 'Para ti']];
  return (
    <Screen>
      <Scroll style={{ paddingBottom: 110 }}>
        <div style={{ position: 'relative', height: 320, borderRadius: '0 0 28px 28px', overflow: 'hidden', background: 'var(--navy-950)' }}>
          <img src={D.images + 'hero-aerial.jpg'} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-bottom)', opacity: 0.9 }}></div>
          <div style={{ position: 'absolute', top: 58, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: 'var(--type-headline-md)', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>MiSanAndrés</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <HIconBtn icon="notifications" tone="glass-dark" label="Notificaciones" />
              <button onClick={() => go('perfil')} style={{ width: 40, height: 40, borderRadius: 20, padding: 0, border: '2px solid rgba(255,255,255,.7)', overflow: 'hidden', cursor: 'pointer' }}><img src={D.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></button>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 64 }}>
            <h2 style={{ margin: 0, font: 'var(--type-headline-md)', color: '#fff' }}>Hola, {D.user.first}</h2>
            <p style={{ margin: '2px 0 0', font: 'var(--type-body-md)', color: 'rgba(255,255,255,.85)' }}>Estas son tus recomendaciones personalizadas</p>
          </div>
        </div>

        <div style={{ margin: '-44px 20px 0', position: 'relative' }}>
          <HGlass tone="strong" padding={16} radius={20}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ font: 'var(--type-label-bold)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Ocupación ahora</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, font: 'var(--type-label-md)', color: 'var(--text-subtle)' }}><HIcon name="schedule" size={14} />Actualizado 10:30</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[['low', low, 'Baja'], ['mid', mid, 'Media'], ['high', high, 'Alta']].map(([k, n, l]) => (
                <div key={k} style={{ padding: '10px 12px', borderRadius: 12, background: `var(--occ-${k}-bg)`, border: `1px solid var(--occ-${k}-border)` }}>
                  <div style={{ font: 'var(--type-headline-md)', fontWeight: 700, color: `var(--occ-${k}-fg)` }}>{n}</div>
                  <div style={{ font: 'var(--type-label-md)', color: `var(--occ-${k}-fg)` }}>Ocupación {l.toLowerCase()}</div>
                </div>
              ))}
            </div>
          </HGlass>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '16px 20px 0' }}>
          {quick.map(([id, ic, l]) => (
            <button key={id} onClick={() => go(id)} style={{ height: 76, borderRadius: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--glass-light)', border: '1px solid var(--glass-border)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', boxShadow: 'var(--glass-shadow)', color: 'var(--text-strong)', font: 'var(--type-label-bold)', fontSize: 13 }}>
              <span style={{ width: 34, height: 34, borderRadius: 17, background: 'rgba(80,217,254,.25)', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HIcon name={ic} size={20} /></span>{l}
            </button>
          ))}
        </div>

        <div style={{ padding: '28px 20px 0' }}><SectionHead title="Destacados para ti" action="Ver todo" onAction={() => go('recomendaciones')} /></div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
          {sorted.slice(0, 3).map(d => (
            <HCard key={d.id} layout="featured" name={d.name} category={d.category} location={d.location.split(' · ')[0]} image={d.image} occupancy={d.occupancy} note={`${d.match}% compatible contigo`} favorite={favs.includes(d.id)} onFavorite={() => toggleFav(d.id)} onClick={() => open(d.id)} style={{ flex: '0 0 272px', height: 300, scrollSnapAlign: 'start' }} />
          ))}
        </div>

        <div style={{ padding: '28px 20px 0' }}>
          <SectionHead title="Recomendados para ti" sub="Lugares con condiciones ideales ahora mismo." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...D.destinos].sort((a, b) => a.occupancy - b.occupancy).slice(0, 3).map(d => (
              <HCard key={d.id} layout="horizontal" name={d.name} category={d.category} image={d.image} occupancy={d.occupancy} note={d.note} onClick={() => open(d.id)} />
            ))}
          </div>
        </div>
      </Scroll>
    </Screen>
  );
}

function ExplorarScreen({ open }) {
  const D = window.MSA_DATA;
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('Todos');
  const [onlyLow, setOnlyLow] = React.useState(false);
  const list = D.destinos.filter(d => (cat === 'Todos' || d.cats.includes(cat)) && (!q || d.name.toLowerCase().includes(q.toLowerCase())) && (!onlyLow || hLevel(d.occupancy) === 'low'));
  return (
    <Screen>
      <Scroll style={{ paddingTop: 236, paddingBottom: 110 }}>
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ font: 'var(--type-label-md)', color: 'var(--text-muted)' }}>{list.length} destinos{cat !== 'Todos' ? ` en ${cat}` : ''}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, font: 'var(--type-label-md)', color: 'var(--text-subtle)' }}><HIcon name="swap_vert" size={16} />Menor ocupación</span>
          </div>
          {list.sort((a, b) => a.occupancy - b.occupancy).map(d => (
            <HCard key={d.id} layout="list" name={d.name} category={d.category} location={d.location.split(' · ')[0]} image={d.image} occupancy={d.occupancy} note={d.distance} onClick={() => open(d.id)} />
          ))}
          {list.length === 0 && (
            <HGlass tone="strong" padding={24} radius={20} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <HIcon name="travel_explore" size={36} color="var(--color-secondary)" />
              <div style={{ font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>Sin resultados</div>
              <div style={{ font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>Prueba con otra categoría o quita los filtros.</div>
            </HGlass>
          )}
        </div>
      </Scroll>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '56px 20px 12px', background: 'rgba(243,246,248,.7)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', borderBottom: '1px solid rgba(255,255,255,.7)', boxShadow: '0 4px 20px rgba(0,20,48,.05)' }}>
        <h1 style={{ margin: '0 0 12px', font: 'var(--type-headline-md)', fontWeight: 700, color: 'var(--text-strong)' }}>Explorar destinos</h1>
        <HSearch value={q} onChange={setQ} onTrailing={() => setOnlyLow(!onlyLow)} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px -20px 0', padding: '0 20px 2px', scrollbarWidth: 'none' }}>
          <HChip active={cat === 'Todos'} onClick={() => setCat('Todos')}>Todos</HChip>
          {D.categorias.map(([c, ic]) => <HChip key={c} icon={ic} active={cat === c} onClick={() => setCat(c)}>{c}</HChip>)}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <HChip accent="turquoise" active={onlyLow} onClick={() => setOnlyLow(!onlyLow)} style={{ height: 30, fontSize: 12 }}>Solo ocupación baja</HChip>
        </div>
      </div>
    </Screen>
  );
}

function RecomendacionesScreen({ open, go }) {
  const D = window.MSA_DATA;
  const [mode, setMode] = React.useState('match');
  const modes = [['match', 'Para ti'], ['calm', 'Tranquilos'], ['near', 'Cerca de ti']];
  const list = [...D.destinos].sort((a, b) => mode === 'match' ? b.match - a.match : mode === 'calm' ? a.occupancy - b.occupancy : a.distance.localeCompare(b.distance));
  const top = list[0];
  return (
    <Screen>
      <Scroll style={{ paddingBottom: 110 }}>
        <HTop large tone="transparent" title="Recomendaciones" subtitle="Según tus preferencias y la ocupación actual" style={{ paddingTop: 52 }} actions={[{ icon: 'tune', label: 'Preferencias', onClick: () => go('preferencias') }]} />
        <div style={{ display: 'flex', gap: 6, margin: '4px 20px 16px', padding: 4, borderRadius: 999, background: 'var(--glass-light)', border: '1px solid var(--glass-border)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', boxShadow: 'var(--glass-shadow)' }}>
          {modes.map(([id, l]) => <button key={id} onClick={() => setMode(id)} style={{ flex: 1, height: 36, border: 0, borderRadius: 999, cursor: 'pointer', font: 'var(--type-label-bold)', fontSize: 12, background: mode === id ? 'var(--color-primary)' : 'transparent', color: mode === id ? '#fff' : 'var(--text-muted)', transition: 'background var(--dur-base)' }}>{l}</button>)}
        </div>
        <div style={{ padding: '0 20px' }}>
          <HCard layout="featured" name={top.name} category={top.category} location={top.location.split(' · ')[0]} image={top.image} occupancy={top.occupancy} note={`Coincide con: ${top.reasons.join(' · ')}`} onClick={() => open(top.id)} style={{ height: 260 }} />
        </div>
        <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionHead title="También te pueden gustar" />
          {list.slice(1).map(d => (
            <HGlass key={d.id} tone="strong" padding={12} radius={16} onClick={() => open(d.id)} style={{ cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center' }}>
              <img src={d.image} alt="" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ font: 'var(--type-headline-sm)', fontSize: 17, color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  <span style={{ font: 'var(--type-label-bold)', color: 'var(--color-secondary)', whiteSpace: 'nowrap' }}>{d.match}%</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {d.reasons.map(r => <span key={r} style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(179,235,255,.45)', color: 'var(--turq-700)', font: 'var(--type-label-md)', fontSize: 11 }}>{r}</span>)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ font: 'var(--type-label-md)', color: 'var(--text-subtle)' }}>{d.distance}</span>
                  <HOcc value={d.occupancy} showValue size="sm" />
                </div>
              </div>
            </HGlass>
          ))}
        </div>
      </Scroll>
    </Screen>
  );
}

/* ---------------- Detail / map / profile ---------------- */
const { DestinoCard: DCard, IndicadorOcupacion: DOcc, OcupacionChart: DChart, GlassPanel: DGlass, IconButton: DIconBtn, Icon: DIcon, Button: DButton, Tag: DTag, FilterChip: DChip, TopBar: DTop, MapMarker: DMarker, UserLocation: DUser, SelectRow: DRow } = window.MiSanAndrSDesignSystem_cf84ac;

function DetalleScreen({ id, onBack, go, favs, toggleFav, openMap }) {
  const D = window.MSA_DATA;
  const d = D.destinos.find(x => x.id === id);
  if (!d) return <EstadosScreen onBack={onBack} initial="notfound" embedded />;
  const fav = favs.includes(d.id);
  const related = D.destinos.filter(x => x.id !== d.id && x.cats.some(c => d.cats.includes(c))).slice(0, 2);
  return (
    <Screen bg="#fff">
      <Scroll style={{ paddingBottom: 170 }}>
        <div style={{ position: 'relative', height: 360 }}>
          <img src={d.hero} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 130, background: 'var(--scrim-top)' }}></div>
          <div style={{ position: 'absolute', left: 20, bottom: 52 }}><DTag tone="glass" icon="photo_library">1 / 8</DTag></div>
        </div>
        <div style={{ position: 'relative', marginTop: -32, borderRadius: '28px 28px 0 0', background: '#fff', padding: '24px 20px 0', boxShadow: 'var(--shadow-sheet)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}><DTag tone="turquoise">{d.category}</DTag></div>
          <h1 style={{ margin: 0, font: 'var(--type-display)', letterSpacing: 'var(--ls-display-lg)', color: 'var(--text-strong)' }}>{d.name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8, font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DIcon name="location_on" size={18} color="var(--color-secondary)" />{d.location}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DIcon name="schedule" size={18} color="var(--color-secondary)" />{d.hours}</span>
          </div>

          <div style={{ marginTop: 20, padding: 16, borderRadius: 20, background: 'linear-gradient(135deg, rgba(179,235,255,.35), rgba(230,227,208,.35))', border: '1px solid var(--border-card)' }}>
            <div style={{ font: 'var(--type-label-bold)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>Ocupación actual</div>
            <DOcc value={d.occupancy} variant="bar" capacity={d.capacity} />
          </div>

          <h3 style={{ margin: '24px 0 8px', font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>Descripción</h3>
          <p style={{ margin: 0, font: 'var(--type-body-md)', lineHeight: '22px', color: 'var(--text-muted)' }}>{d.desc}</p>

          <h3 style={{ margin: '24px 0 10px', font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>Características</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{d.features.map(([ic, l]) => <DTag key={l} icon={ic}>{l}</DTag>)}</div>

          <h3 style={{ margin: '24px 0 4px', font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>Ocupación durante el día</h3>
          <p style={{ margin: '0 0 14px', font: 'var(--type-label-md)', color: 'var(--text-subtle)' }}>Hoy · la barra resaltada es la hora actual</p>
          <DChart height={110} highlight={3} data={d.history.map((v, i) => ({ label: D.hours[i], value: v }))} />

          {related.length > 0 && <>
            <h3 style={{ margin: '28px 0 12px', font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>Recomendaciones relacionadas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {related.map(r => <DCard key={r.id} layout="list" name={r.name} category={r.category} image={r.image} occupancy={r.occupancy} note={r.distance} onClick={() => go('detalle', r.id)} />)}
            </div>
          </>}
        </div>
      </Scroll>
      <div style={{ position: 'absolute', top: 56, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', zIndex: 5 }}>
        <DIconBtn icon="arrow_back" tone="glass-dark" label="Volver" onClick={onBack} />
        <div style={{ display: 'flex', gap: 8 }}>
          <DIconBtn icon="share" tone="glass-dark" label="Compartir" />
          <DIconBtn icon="favorite" tone="glass-dark" active={fav} label="Favorito" onClick={() => toggleFav(d.id)} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 22, zIndex: 20, padding: 10, borderRadius: 28, display: 'flex', gap: 8, background: 'rgba(255,255,255,.62)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,.7)', boxShadow: '0 10px 30px rgba(0,20,48,.16), inset 0 1px 0 #fff' }}>
        <DButton size="lg" icon="map" onClick={() => openMap(d.id)} style={{ flex: 1, borderRadius: 20 }}>Ver ubicación</DButton>
        <DButton size="lg" variant="glass" icon="auto_awesome" onClick={() => go('recomendaciones')} style={{ flex: 1, borderRadius: 20 }}>Similares</DButton>
      </div>
    </Screen>
  );
}

function MapaScreen({ open, selected, setSelected, favs, toggleFav }) {
  const D = window.MSA_DATA;
  const [cat, setCat] = React.useState('Todos');
  const list = D.destinos.filter(d => cat === 'Todos' || d.cats.includes(cat));
  const sel = D.destinos.find(d => d.id === selected) || list[0];
  return (
    <Screen bg="#8fd9ec">
      <div style={{ position: 'absolute', inset: 0, background: `url(${D.images}map-island.png) center/cover` }}>
        {list.map(d => <DMarker key={d.id} style={d.pin} active={sel && sel.id === d.id} label={d.name} occupancy={d.occupancy} onClick={() => setSelected(d.id)} />)}
        <DUser style={{ top: '50%', left: '52%' }} />
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <DTop title="Mapa de destinos" actions={[{ icon: 'my_location', label: 'Mi ubicación' }, { icon: 'tune', label: 'Filtros' }]} style={{ paddingTop: 52 }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 20px', scrollbarWidth: 'none' }}>
          {['Todos', 'Playas', 'Naturaleza', 'Aventura', 'Cultura'].map(c => <DChip key={c} glass accent="turquoise" active={cat === c} onClick={() => setCat(c)}>{c}</DChip>)}
        </div>
      </div>
      <div style={{ position: 'absolute', right: 16, bottom: 236, zIndex: 10 }}>
        <DGlass tone="strong" padding={10} radius={14} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[['low', 'Baja'], ['mid', 'Media'], ['high', 'Alta']].map(([k, l]) => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--type-label-md)', color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: 4, background: `var(--occ-${k})` }}></span>{l}</span>)}
        </DGlass>
      </div>
      {sel && <div style={{ position: 'absolute', left: 12, right: 12, bottom: 104, zIndex: 20 }}>
        <DCard layout="map" name={sel.name} category={sel.category} location={sel.location.split(' · ')[0]} image={sel.image} occupancy={sel.occupancy} favorite={favs.includes(sel.id)} onFavorite={() => toggleFav(sel.id)} onClick={() => open(sel.id)} />
      </div>}
    </Screen>
  );
}

function PerfilScreen({ go, onLogout, favs }) {
  const D = window.MSA_DATA;
  return (
    <Screen>
      <Scroll style={{ paddingBottom: 110 }}>
        <DTop large tone="transparent" title="Mi perfil" style={{ paddingTop: 52 }} actions={[{ icon: 'settings', label: 'Ajustes' }]} />
        <div style={{ padding: '4px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <DGlass tone="strong" padding={16} radius={20} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={D.user.avatar} alt="" style={{ width: 64, height: 64, borderRadius: 32, objectFit: 'cover', border: '2px solid #fff', boxShadow: 'var(--shadow-2)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: 'var(--type-headline-sm)', color: 'var(--text-strong)' }}>{D.user.name}</div>
              <div style={{ font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>{D.user.email}</div>
            </div>
            <DIconBtn icon="edit" tone="tonal" label="Editar perfil" />
          </DGlass>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[[favs.length, 'Favoritos'], [3, 'Intereses'], ['Baja', 'Ocupación pref.']].map(([n, l]) => (
              <DGlass key={l} padding={12} radius={16} style={{ textAlign: 'center' }}>
                <div style={{ font: 'var(--type-headline-sm)', fontWeight: 700, color: 'var(--text-strong)' }}>{n}</div>
                <div style={{ font: 'var(--type-label-md)', color: 'var(--text-subtle)' }}>{l}</div>
              </DGlass>
            ))}
          </div>
          <DGlass tone="strong" padding={0} radius={20} style={{ overflow: 'hidden' }}>
            <DRow icon="tune" label="Mis preferencias" description="Ver y editar preferencias" control="chevron" onClick={() => go('preferencias')} />
            <DRow icon="notifications_active" label="Alertas de ocupación" description="Avisarme cuando baje la ocupación" control="switch" checked />
            <DRow icon="favorite" label="Favoritos" description="Lugares guardados" control="chevron" />
            <DRow icon="wifi_off" iconTone="neutral" label="Estados de la app" description="Vista previa de loading, error y vacío" control="chevron" onClick={() => go('estados')} />
            <DRow icon="info" iconTone="neutral" label="Acerca de la app" description="Información y ayuda" control="chevron" divider={false} />
          </DGlass>
          <DButton variant="danger" size="lg" fullWidth icon="logout" onClick={onLogout}>Cerrar sesión</DButton>
        </div>
      </Scroll>
    </Screen>
  );
}

function PreferenciasScreen({ onBack }) {
  const D = window.MSA_DATA;
  const [sel, setSel] = React.useState(['Playas', 'Naturaleza', 'Aventura']);
  const [occ, setOcc] = React.useState('low');
  const [saved, setSaved] = React.useState(false);
  const toggle = c => { setSaved(false); setSel(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c]); };
  return (
    <Screen>
      <Scroll style={{ paddingBottom: 120 }}>
        <DTop title="Editar preferencias" onBack={onBack} tone="transparent" style={{ paddingTop: 52 }} />
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: '0 0 8px', font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>Cuéntanos qué te gusta para mejorar tus recomendaciones.</p>
          <h2 style={{ margin: 0, font: 'var(--type-label-bold)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase', color: 'var(--text-body)' }}>Categorías de interés</h2>
          <DGlass tone="strong" padding={0} radius={16} style={{ overflow: 'hidden' }}>
            {D.categorias.map(([c, ic], i) => <DRow key={c} icon={ic} iconTone={sel.includes(c) ? 'turquoise' : 'neutral'} label={c} checked={sel.includes(c)} onClick={() => toggle(c)} divider={i < D.categorias.length - 1} style={{ minHeight: 58, padding: '9px 16px' }} />)}
          </DGlass>
          <h2 style={{ margin: '12px 0 0', font: 'var(--type-label-bold)', letterSpacing: 'var(--ls-overline)', textTransform: 'uppercase', color: 'var(--text-body)' }}>Nivel de ocupación preferido</h2>
          <DGlass tone="strong" padding={0} radius={16} style={{ overflow: 'hidden' }}>
            {[['low', 'Baja', 'signal_cellular_alt_1_bar', 'Lugares tranquilos'], ['mid', 'Media', 'signal_cellular_alt_2_bar', 'Algo de ambiente'], ['high', 'Alta', 'signal_cellular_alt', 'No me importa si hay gente']].map(([k, l, ic, desc], i) => (
              <DRow key={k} icon={ic} iconTone={k} label={l} description={desc} control="radio" checked={occ === k} onClick={() => { setOcc(k); setSaved(false); }} divider={i < 2} />
            ))}
          </DGlass>
        </div>
      </Scroll>
      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 22, zIndex: 20, padding: 10, borderRadius: 28, background: 'rgba(255,255,255,.62)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: '1px solid rgba(255,255,255,.7)', boxShadow: '0 10px 30px rgba(0,20,48,.16), inset 0 1px 0 #fff' }}>
        <DButton size="lg" fullWidth icon={saved ? 'check' : undefined} variant={saved ? 'secondary' : 'primary'} onClick={() => setSaved(true)} style={{ borderRadius: 20 }}>{saved ? 'Cambios guardados' : 'Guardar cambios'}</DButton>
      </div>
    </Screen>
  );
}

/* ---------------- Estados de la app (loading / vacío / error) ---------------- */
function StateCard({ icon, tone = 'turquoise', title, sub, action, onAction }) {
  const iconBg = tone === 'danger' ? 'rgba(217,48,37,.12)' : tone === 'good' ? 'rgba(30,142,62,.12)' : 'rgba(80,217,254,.25)';
  const iconFg = tone === 'danger' ? 'var(--occ-high-fg)' : tone === 'good' ? 'var(--occ-low-fg)' : 'var(--color-secondary)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '0 28px' }}>
      <span style={{ width: 72, height: 72, borderRadius: 36, background: iconBg, color: iconFg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DIcon name={icon} size={34} /></span>
      <div>
        <div style={{ font: 'var(--type-headline-sm)', color: 'var(--text-strong)', marginBottom: 6 }}>{title}</div>
        <div style={{ font: 'var(--type-body-md)', lineHeight: '22px', color: 'var(--text-muted)' }}>{sub}</div>
      </div>
      {action && <DButton size="lg" onClick={onAction} style={{ minWidth: 180 }}>{action}</DButton>}
    </div>
  );
}

function EstadosScreen({ onBack, initial, embedded }) {
  const [s, setS] = React.useState(initial || 'loading');
  const tabs = [['loading', 'Cargando'], ['empty', 'Vacío'], ['notfound', 'No encontrado'], ['recs', 'Sin recomendaciones'], ['offline', 'Sin conexión'], ['error', 'Error'], ['confirm', 'Confirmación']];
  const content = () => {
    if (s === 'loading') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <span style={{ width: 44, height: 44, borderRadius: 22, border: '4px solid rgba(0,103,125,.15)', borderTopColor: 'var(--color-secondary)', animation: 'msa-spin 0.9s linear infinite' }}></span>
        <span style={{ font: 'var(--type-body-md)', color: 'var(--text-muted)' }}>Cargando destinos…</span>
      </div>
    );
    if (s === 'empty') return <StateCard icon="favorite_border" title="Aún no tienes favoritos" sub="Guarda destinos que te gusten para encontrarlos rápido aquí." action="Explorar destinos" />;
    if (s === 'notfound') return <StateCard icon="location_off" title="Destino no encontrado" sub="Puede que ya no esté disponible. Vuelve a explorar para encontrar otros lugares." action="Volver" onAction={onBack} />;
    if (s === 'recs') return <StateCard icon="auto_awesome" title="Recomendaciones no disponibles" sub="Aún no tenemos suficientes datos para recomendarte destinos. Completa tus preferencias." action="Editar preferencias" />;
    if (s === 'offline') return <StateCard icon="wifi_off" tone="danger" title="Sin conexión" sub="Verifica tu conexión a internet e intenta de nuevo." action="Reintentar" />;
    if (s === 'error') return <StateCard icon="error_outline" tone="danger" title="Algo salió mal" sub="No pudimos cargar esta información. Intenta de nuevo en unos minutos." action="Reintentar" />;
    if (s === 'confirm') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderRadius: 18, background: 'rgba(30,142,62,.1)', border: '1px solid rgba(30,142,62,.25)' }}>
          <DIcon name="check_circle" size={22} color="var(--occ-low-fg)" />
          <span style={{ font: 'var(--type-body-md)', fontWeight: 600, color: 'var(--occ-low-fg)' }}>Cambios guardados</span>
        </div>
        <span style={{ font: 'var(--type-body-md)', color: 'var(--text-muted)', textAlign: 'center' }}>Tus preferencias se actualizaron correctamente.</span>
      </div>
    );
    return null;
  };
  return (
    <Screen>
      <Scroll style={{ paddingBottom: 40 }}>
        {!embedded && <DTop title="Estados de la app" onBack={onBack} tone="transparent" style={{ paddingTop: 52 }} />}
        {!embedded && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 20px 20px', scrollbarWidth: 'none' }}>
            {tabs.map(([id, l]) => <DChip key={id} active={s === id} onClick={() => setS(id)}>{l}</DChip>)}
          </div>
        )}
        <div style={{ minHeight: embedded ? 500 : 380, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0 60px' }}>{content()}</div>
      </Scroll>
      {embedded && <div style={{ position: 'absolute', top: 56, left: 20, zIndex: 5 }}><DIconBtn icon="arrow_back" tone="glass-dark" label="Volver" onClick={onBack} /></div>}
    </Screen>
  );
}

/* ---------------- App ---------------- */
const { BottomNav: ABottomNav } = window.MiSanAndrSDesignSystem_cf84ac;
const TABS = ['inicio', 'explorar', 'recomendaciones', 'mapa', 'perfil'];

function App() {
  const saved = (() => { try { return JSON.parse(localStorage.getItem('msa-kit-route')) || null; } catch (e) { return null; } })();
  const [stack, setStack] = React.useState(saved || [{ s: 'splash' }]);
  const [favs, setFavs] = React.useState(['johnny']);
  const [mapSel, setMapSel] = React.useState('johnny');
  React.useEffect(() => { localStorage.setItem('msa-kit-route', JSON.stringify(stack)); }, [stack]);

  const cur = stack[stack.length - 1];
  const isTab = TABS.includes(cur.s);
  const go = (s, id) => setStack(st => TABS.includes(s) ? [{ s }] : [...st, { s, id }]);
  const back = () => setStack(st => st.length > 1 ? st.slice(0, -1) : st);
  const open = id => go('detalle', id);
  const toggleFav = id => setFavs(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  const openMap = id => { setMapSel(id); setStack([{ s: 'mapa' }]); };

  let view;
  switch (cur.s) {
    case 'splash': view = <SplashScreen onStart={() => setStack([{ s: 'login' }])} />; break;
    case 'login': view = <LoginScreen onLogin={() => setStack([{ s: 'inicio' }])} onRegister={() => go('registro')} />; break;
    case 'registro': view = <RegisterScreen onBack={back} onDone={() => setStack([{ s: 'preferencias', first: true }])} />; break;
    case 'inicio': view = <HomeScreen go={go} open={open} favs={favs} toggleFav={toggleFav} />; break;
    case 'explorar': view = <ExplorarScreen open={open} />; break;
    case 'recomendaciones': view = <RecomendacionesScreen open={open} go={go} />; break;
    case 'mapa': view = <MapaScreen open={open} selected={mapSel} setSelected={setMapSel} favs={favs} toggleFav={toggleFav} />; break;
    case 'perfil': view = <PerfilScreen go={go} favs={favs} onLogout={() => setStack([{ s: 'login' }])} />; break;
    case 'preferencias': view = <PreferenciasScreen onBack={() => stack.length > 1 ? back() : setStack([{ s: 'inicio' }])} />; break;
    case 'estados': view = <EstadosScreen onBack={back} />; break;
    case 'detalle': view = <DetalleScreen key={cur.id} id={cur.id} onBack={back} go={go} favs={favs} toggleFav={toggleFav} openMap={openMap} />; break;
    default: view = null;
  }
  const dark = ['splash', 'inicio', 'detalle', 'login', 'registro'].includes(cur.s);
  return (
    <Phone darkStatus={dark}>
      {view}
      {isTab && <ABottomNav active={cur.s} onChange={s => setStack([{ s }])} />}
    </Phone>
  );
}

window.MSAApp = App;
