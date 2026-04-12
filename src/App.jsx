import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import FunMode from './FunMode'
import './funmode.css'

const IK = 'https://ik.imagekit.io/iu69j6qea/MW/'

const IMAGES = [
  'a6f48f6b-c3b9-4f6f-8db3-5ee570efece0.avif',
  'c3909867-ea5d-487b-8438-3ffe73b50892.avif',
  'cd1c83dc-a8ff-4be0-aa04-3ba50d43743e.avif',
  '2e296b0c-451e-45f2-8563-d738c28bbd36.avif',
  '61e8fd9c-1393-49e8-8453-1c9b74c88e57.avif',
  '51b24bd1-8903-4b94-a394-56dc84561493.avif',
  'ca6f9d5b-53e8-49f2-9a64-73e8da27a510.avif',
  '963c8a0b-93ec-400f-bbed-e80442044804.avif',
  'ad58b45a-3e7b-486f-a178-50d54b7da81c.avif',
  '81f8dd35-074c-48c9-a31f-90183c48277e.avif',
  '353ddc37-b6eb-455a-abd2-11d07c317824.avif',
  '3c77e527-eaa4-4dde-bb3f-1b5f09c22ef3.avif',
  '9369310e-1ebd-4a1c-ae02-a1f52958680e.avif',
]

const HERO_LINES = [
  'Schauspieler.',
  'Bariton.',
  'Pferd. (Ja, wirklich.)',
  'Hamlet-Versteher.',
  'Weihnachtsbaum-Darsteller.',
]

const FILMOGRAPHY = {
  Theater: [
    { year: '2026', title: 'Frau Yamamoto ist noch da', role: 'Nino', director: 'Alina Fluck', house: 'Theater Osnabrück' },
    { year: '2025', title: 'fünf minuten stille', role: '3', director: 'Anna Werner', house: 'Theater Osnabrück' },
    { year: '2025', title: 'Ödipus Exzellenz', role: 'Generalvikar', director: 'Lorenz Nolting, Sofie Boiten, Karl Haucke', house: 'Theater Osnabrück' },
    { year: '2025', title: 'Drei Winter', role: 'Marko Horvath', director: 'Kathrin Mayr', house: 'Theater Osnabrück' },
    { year: '2025', title: 'Sonne / Luft / Asche', role: 'Luft / Asche', director: 'Christian Schlüter', house: 'Theater Osnabrück' },
    { year: '2024–25', title: 'Kohlhaas (Glück der Erde, Rücken der Pferde)', role: 'Das Pferd', director: 'Lorenz Nolting', house: 'Theater Osnabrück' },
    { year: '2024', title: 'Der große Gatsby', role: 'Jay Gatsby', director: 'Julia Prechsl', house: 'Theater Osnabrück' },
    { year: '2023–24', title: 'Draußen vor der Tür', role: 'Beckmann', director: 'Philipp Preuss', house: 'Saarl. Staatstheater' },
    { year: '2023–24', title: '#Peep!', role: 'Puppe zum halben Preis', director: 'Mona Sabaschus', house: 'Saarl. Staatstheater' },
    { year: '2023–24', title: 'Die Bettwurst - Das Musical', role: 'Weihnachtsbaum', director: 'Paul Spittler', house: 'Saarl. Staatstheater' },
    { year: '2023', title: 'Hamlet', role: 'Hamlet', director: 'Bettina Bruinier', house: 'Saarl. Staatstheater' },
    { year: '2022', title: 'Die Ratten', role: 'Bruno', director: 'Julia Prechsl', house: 'Saarl. Staatstheater' },
    { year: '2022', title: 'Jedermann.Bliesgau', role: 'Tod | Guter Gesell', director: 'Bettina Bruinier', house: 'Saarl. Staatstheater' },
    { year: '2022', title: 'Der große Gatsby', role: 'Nick Carraway', director: 'Bettina Bruinier', house: 'Saarl. Staatstheater' },
    { year: '2021–22', title: 'Spieler und Tod', role: 'Tod', director: 'Thorsten Köhler', house: 'Saarl. Staatstheater' },
    { year: '2020–22', title: 'Trüffel Trüffel Trüffel', role: 'Frédéric Ratinois', director: 'Julia Prechsl', house: 'Saarl. Staatstheater' },
    { year: '2021', title: 'Der Besuch der alten Dame', role: 'Pfarrer', director: 'Gustav Rueb', house: 'Saarl. Staatstheater' },
    { year: '2021', title: 'Der Geizige', role: 'Mariane', director: 'Matthias Rippert', house: 'Saarl. Staatstheater' },
    { year: '2019–20', title: 'Hoffnung', role: 'Egon Starck', director: 'Krzystof Minkowski', house: 'Saarl. Staatstheater' },
    { year: '2019–20', title: 'Frühlings Erwachen', role: 'Melchior Gabor', director: 'Magali Tosato', house: 'Saarl. Staatstheater' },
    { year: '2019', title: 'Dosenfleisch', role: 'Rolf', director: 'Niklas Ritter', house: 'Saarl. Staatstheater' },
    { year: '2018–19', title: 'Der Streit', role: 'Adine', director: 'Matthias Rippert', house: 'Saarl. Staatstheater' },
    { year: '2018–19', title: 'Das achte Leben (für Brilka)', role: 'Simon | Ramas | Andro | Miqa | Vaso | Lascha', director: 'Bettina Bruinier', house: 'Saarl. Staatstheater' },
    { year: '2018', title: 'Dantons Tod', role: 'Camille Desmoulins', director: 'Christoph Mehler', house: 'Saarl. Staatstheater' },
    { year: '2018', title: 'Wir sind die Guten', role: 'Soldat ohne Kopf | Brian', director: 'Bettina Bruinier', house: 'Saarl. Staatstheater' },
    { year: '2017–18', title: 'Der Große Preis - Songs für Europa', role: 'Italien', director: 'Thorsten Köhler', house: 'Saarl. Staatstheater' },
    { year: '2017', title: 'Kabale und Liebe', role: 'Ferdinand', director: 'Achim Lenz', house: 'Gandersheimer Domfestspiele' },
    { year: '2016–17', title: 'Die Borderline Prozession', role: 'Mann im Auto | Soldat | Lolita', director: 'Kay Voges', house: 'Schauspiel Dortmund' },
    { year: '2015–16', title: 'Der Impresario von Smyrna', role: 'Maccario', director: 'Marco Massafra', house: 'Schauspielhaus Bochum' },
    { year: '2016', title: 'Preparadise sorry now', role: 'Andere Rollen', director: 'Anne-Kathrine Münnich', house: 'Folkwang Theaterzentrum' },
  ],
  'Film / TV': [
    { year: '2016', title: 'Restless', role: 'Vincent', director: 'Julia Schubeius', house: 'FH Dortmund' },
  ],
  Audio: [
    { year: '2017–18', title: 'Weltenbummler und Meisterdiebe', role: 'Fanta', director: 'Stefan Oberle', house: '' },
  ],
}

const AWARDS = [
  { year: '2023', title: 'SponsorClubPreis' },
  { year: '2017', title: 'Einladung Berliner Theatertreffen' },
]

const SKILLS_DATA = {
  Sprachen: [
    { name: 'Deutsch', level: 'Muttersprache', pro: true },
    { name: 'Polnisch', level: '', pro: true },
    { name: 'Englisch', level: '', pro: true },
  ],
  Gesang: [
    { name: 'Musical', level: '', pro: true },
    { name: 'Pop', level: '', pro: true },
    { name: 'Rap', level: '', pro: true },
  ],
  Sport: [
    { name: 'Fechten (Bühne)', level: '', pro: true },
    { name: 'Handball', level: '' },
    { name: 'Tanzsport', level: '' },
  ],
  Sonstiges: [
    { name: 'Stimmlage: Bariton', level: '', pro: true },
    { name: 'Führerschein Klasse B', level: '' },
  ],
}

/* ═══════ COMPONENTS ═══════ */

function FadeIn({ children, className, delay = 0 }) {
  const [ref, inView] = useInView({ triggerOnce: true, threshold: 0.08 })
  return (
    <motion.div ref={ref} className={className}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >{children}</motion.div>
  )
}

const VIDEOS = [
  { id: 1, title: 'Showreel', description: 'Das Beste in 3 Minuten', embedUrl: '' },
  { id: 2, title: 'Hamlet – Monolog', description: 'Sein oder Nichtsein, Saarländisches Staatstheater', embedUrl: '' },
  { id: 3, title: 'Kohlhaas – Szene', description: 'Michael Kohlhaas, Theater Osnabrück', embedUrl: '' },
  { id: 4, title: 'Musical Reel', description: 'Gesang & Tanz Highlights', embedUrl: '' },
]

function VideoSection() {
  const [active, setActive] = useState(0)
  const v = VIDEOS[active]
  return (
    <div className="video-section">
      <div className="video-tabs">
        {VIDEOS.map((vid, i) => (
          <button key={vid.id} className={`video-tab ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
            {vid.title}
          </button>
        ))}
      </div>
      <FadeIn key={active}>
        <div className="video-player-wrap">
          {v.embedUrl ? (
            <iframe src={v.embedUrl} title={v.title} className="video-iframe" allowFullScreen allow="autoplay" />
          ) : (
            <div className="video-placeholder">
              <span>📽️</span>
              <p>{v.title}</p>
              <p className="video-placeholder-hint">Google Drive Video wird hier eingebettet</p>
            </div>
          )}
        </div>
        <div className="video-info">
          <h3>{v.title}</h3>
          <p>{v.description}</p>
        </div>
      </FadeIn>
    </div>
  )
}

function RotatingText() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % HERO_LINES.length), 2800)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="rotating-text">
      <AnimatePresence mode="wait">
        <motion.span key={idx}
          initial={{ opacity: 0, y: 30, rotateX: -40 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, y: -30, rotateX: 40 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {HERO_LINES[idx]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

function Lightbox({ lightbox, setLightbox }) {
  return (
    <AnimatePresence>
      {lightbox !== null && (
        <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <button className="lightbox-nav prev" onClick={e => { e.stopPropagation(); setLightbox(i => (i - 1 + IMAGES.length) % IMAGES.length) }}>‹</button>
          <motion.img key={lightbox} src={`${IK}${IMAGES[lightbox]}?tr=w-1400`} alt=""
            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.35 }} onClick={e => e.stopPropagation()} />
          <button className="lightbox-nav next" onClick={e => { e.stopPropagation(); setLightbox(i => (i + 1) % IMAGES.length) }}>›</button>
          <div className="lightbox-counter">{lightbox + 1} / {IMAGES.length}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MarqueeStrip({ items, speed = 30 }) {
  return (
    <div className="marquee-strip">
      <div className="marquee-track" style={{ animationDuration: `${speed}s` }}>
        {[...items, ...items].map((item, i) => (
          <span key={i} className="marquee-item">{item}<span className="marquee-dot">●</span></span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState('normal') // 'normal' | 'fun'
  const [lightbox, setLightbox] = useState(null)
  const [activeTab, setActiveTab] = useState('Theater')
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '40%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  if (mode === 'fun') {
    return <FunMode onBack={() => { setMode('normal'); window.scrollTo(0, 0) }} />
  }

  return (
    <div className="app">
      {/* NAV */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-logo" onClick={() => scrollTo('top')}>
          MW<span>.</span>
        </div>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {['about', 'gallery', 'videos', 'career', 'skills', 'contact'].map(id => (
            <button key={id} onClick={() => scrollTo(id)}>{id === 'about' ? 'Über' : id === 'gallery' ? 'Fotos' : id === 'videos' ? 'Videos' : id === 'career' ? 'Vita' : id === 'skills' ? 'Skills' : 'Kontakt'}</button>
          ))}
        </div>
        <button className="nav-burger" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </nav>

      {/* HERO */}
      <section className="hero" id="top" ref={heroRef}>
        <motion.div className="hero-img-wrap" style={{ y: heroY }}>
          <img src={`${IK}${IMAGES[0]}?tr=w-1400,h-1000,fo-face`} alt="Michi Wischniowski" />
        </motion.div>
        <div className="hero-overlay" />
        <motion.div className="hero-content" style={{ opacity: heroOpacity }}>
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3 }}>
            <h1 className="hero-title">
              <span className="hero-first">Michi</span>
              <span className="hero-last">Wischniowski</span>
            </h1>
            <RotatingText />
            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => scrollTo('career')}>Was ich so mache</button>
              <button className="btn btn-ghost" onClick={() => scrollTo('contact')}>Schreib mir</button>
              <button className="btn btn-fun" onClick={() => { setMode('fun'); window.scrollTo(0, 0) }}>🕹️ Follow the Fun</button>
            </div>
          </motion.div>
        </motion.div>
        <div className="scroll-hint">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>↓</motion.div>
        </div>
      </section>

      {/* MARQUEE */}
      <MarqueeStrip items={[
        'Hamlet', 'Jay Gatsby', 'Beckmann', 'Das Pferd', 'Der Tod', 'Weihnachtsbaum',
        'Camille Desmoulins', 'Ferdinand', 'Melchior Gabor', 'Nick Carraway'
      ]} />

      {/* ABOUT */}
      <section id="about" className="section">
        <div className="about-grid">
          <FadeIn className="about-img-col">
            <img src={`${IK}${IMAGES[1]}?tr=w-600`} alt="Michi" className="about-portrait" />
          </FadeIn>
          <FadeIn className="about-text-col" delay={0.15}>
            <span className="label">Über Michi</span>
            <h2 className="heading-lg">185 cm Bühnenenergie<br />aus Hamburg.</h2>
            <p className="body-text">
              Jahrgang 1990. Ausgebildet an der Folkwang Universität der Künste (2013–2017). 
              Seitdem auf Bühnen in Dortmund, Bochum, Saarbrücken und Osnabrück unterwegs – 
              als Hamlet, als Gatsby, als Tod, als Pferd. Ja, auch als Weihnachtsbaum.
            </p>
            <p className="body-text">
              Lebt in Osnabrück, hat eine Wohnung in Gdańsk (fürs Gemüt), spricht Deutsch, 
              Polnisch und genug Englisch. Singt Bariton, rappt wenn nötig, fechtet auf der Bühne 
              und spielt Handball wenn keiner zuguckt.
            </p>
            <div className="about-details">
              <div className="detail"><span>Spielalter</span><strong>30–37</strong></div>
              <div className="detail"><span>Größe</span><strong>185 cm</strong></div>
              <div className="detail"><span>Stimmlage</span><strong>Bariton</strong></div>
              <div className="detail"><span>Augen</span><strong>blau</strong></div>
              <div className="detail"><span>Haare</span><strong>braun</strong></div>
              <div className="detail"><span>Basis</span><strong>Osnabrück / Gdańsk</strong></div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FUN COUNTER STRIP */}
      <section className="counter-strip">
        <FadeIn>
          <div className="counters">
            {[
              ['30+', 'Rollen', '(und ein Pferd)'],
              ['1', 'Hamlet', '(reicht ja auch)'],
              ['2×', 'Gatsby', '(Nick & Jay)'],
              ['3×', 'Der Tod', '(typecasting?)'],
            ].map(([num, label, joke]) => (
              <div className="counter" key={label}>
                <span className="counter-num">{num}</span>
                <span className="counter-label">{label}</span>
                <span className="counter-joke">{joke}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="section section-dark">
        <FadeIn><span className="label">Fotos</span><h2 className="heading-lg">Guck mal.</h2></FadeIn>
        <FadeIn delay={0.1}>
          <div className="gallery-grid">
            {IMAGES.map((img, i) => (
              <motion.div key={i} className="gallery-item" onClick={() => setLightbox(i)}
                whileHover={{ scale: 1.04 }} transition={{ duration: 0.3 }}>
                <img src={`${IK}${img}?tr=w-500`} alt={`Michi – ${i + 1}`} loading="lazy" />
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* VIDEOS */}
      <section id="videos" className="section">
        <FadeIn><span className="label">Videos</span><h2 className="heading-lg">In Aktion.<br /><em>(Bewegte Bilder.)</em></h2></FadeIn>
        <VideoSection />
      </section>

      {/* CAREER */}
      <section id="career" className="section">
        <FadeIn><span className="label">Vita</span><h2 className="heading-lg">Was bisher geschah.</h2></FadeIn>

        {/* Education */}
        <FadeIn delay={0.05}>
          <div className="edu-block">
            <h3 className="heading-sm">Ausbildung</h3>
            <div className="edu-item">
              <span className="edu-year">2013–2017</span>
              <div><strong>Folkwang Universität der Künste</strong><br />Schauspielstudium</div>
            </div>
            <div className="edu-item">
              <span className="edu-year">2022</span>
              <div><strong>Grotowski Institut</strong><br />Workshop, Wrocław/Brzezinka</div>
            </div>
          </div>
        </FadeIn>

        {/* Awards */}
        <FadeIn delay={0.05}>
          <div className="awards-block">
            <h3 className="heading-sm">Auszeichnungen</h3>
            {AWARDS.map((a, i) => (
              <div className="award-row" key={i}>
                <span className="award-year">{a.year}</span>
                <strong>{a.title}</strong>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Filmography tabs */}
        <FadeIn delay={0.1}>
          <div className="career-tabs">
            {Object.keys(FILMOGRAPHY).map(tab => (
              <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                {tab}<span className="tab-count">{FILMOGRAPHY[tab].length}</span>
              </button>
            ))}
          </div>
        </FadeIn>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} className="career-list"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
            {FILMOGRAPHY[activeTab].map((item, i) => (
              <motion.div className="career-item" key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
                <span className="career-year">{item.year}</span>
                <div className="career-info">
                  <div className="career-title">{item.title}</div>
                  <div className="career-role">als {item.role}</div>
                  <div className="career-meta">R: {item.director}{item.house ? ` · ${item.house}` : ''}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* SKILLS */}
      <section id="skills" className="section section-dark">
        <FadeIn><span className="label">Skills</span><h2 className="heading-lg">Was ich kann.<br /><em>(Und was ich behaupte.)</em></h2></FadeIn>
        <div className="skills-grid">
          {Object.entries(SKILLS_DATA).map(([cat, items], ci) => (
            <FadeIn key={cat} delay={ci * 0.05}>
              <div className="skill-card">
                <h3>{cat}</h3>
                {items.map((s, i) => (
                  <div className="skill-row" key={i}>
                    <span>{s.name}</span>
                    {s.level && <span className={`skill-badge ${s.pro ? 'pro' : ''}`}>{s.level}</span>}
                  </div>
                ))}
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section contact-section">
        <FadeIn>
          <div className="contact-inner">
            <span className="label center">Kontakt</span>
            <h2 className="heading-lg center">Lass uns<br /><em>was machen.</em></h2>
            <p className="body-text center">Casting, Zusammenarbeit oder einfach Hallo sagen.</p>
            <div className="contact-buttons">
              <a href="https://www.schauspielervideos.de/fullprofile/michi-wischniowski.html" target="_blank" rel="noopener noreferrer" className="btn btn-primary">Profil auf Schauspielervideos.de</a>
              <a href="mailto:kontakt@michiwischniowski.de" className="btn btn-ghost">E-Mail schreiben</a>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} Michi Wischniowski</span>
          <span className="footer-joke">Kein Pferd wurde bei der Erstellung dieser Webseite verletzt.</span>
        </div>
      </footer>

      <Lightbox lightbox={lightbox} setLightbox={setLightbox} />
    </div>
  )
}
