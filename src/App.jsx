import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, ChevronRight, MapPin, Phone, MessageCircle, Check, Loader2, Mail } from 'lucide-react';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [language, setLanguage] = useState('EN');
  const [visitorName, setVisitorName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [visitorToken, setVisitorToken] = useState('');
  const [visitorNumber, setVisitorNumber] = useState(100);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [rsvpStatus, setRsvpStatus] = useState('');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState(false);

  const [genderVote, setGenderVote] = useState('');
  const [genderLoading, setGenderLoading] = useState(false);
  const [genderResults, setGenderResults] = useState({ boy: 0, girl: 0, total: 0 });

  const [arrivalVote, setArrivalVote] = useState('');
  const [arrivalLoading, setArrivalLoading] = useState(false);
  const [arrivalResults, setArrivalResults] = useState({ August: 0, September: 0, October: 0, total: 0 });

  const [babyNameInput, setBabyNameInput] = useState('');
  const [babyNameLoading, setBabyNameLoading] = useState(false);
  const [babyNameSuccess, setBabyNameSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    let token = localStorage.getItem('visitor_token');
    if (!token) {
      token = 'uuid-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('visitor_token', token);
    }
    setVisitorToken(token);

    fetch('/api/getVisitorCount')
      .then(res => res.json())
      .then(data => { if (data.count) setVisitorNumber(data.count); })
      .catch(() => {});

    fetch('/api/gender/results').then(res => res.json()).then(data => { if(data && data.total !== undefined) setGenderResults(data); }).catch(()=>{});
    fetch('/api/arrival/results').then(res => res.json()).then(data => { if(data && data.total !== undefined) setArrivalResults(data); }).catch(()=>{});

    const eventDate = new Date("August 2, 2026 17:30:00").getTime();
    const timer = setInterval(() => {
      const distance = eventDate - new Date().getTime();
      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !mobileNumber.trim()) return;
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      const res = await fetch('/api/createVisitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_token: visitorToken,
          visitor_name: visitorName,
          mobile_number: cleanMobile,
          language: language,
          browser: navigator.userAgent,
          device: window.innerWidth < 768 ? 'Mobile' : 'Desktop'
        })
      });
      const data = await res.json();
      if (data.guestNumber) setVisitorNumber(data.guestNumber);
    } catch (err) {
      console.error(err);
    }

    setIsUnlocked(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 100);
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const scrollToContent = () => {
    document.getElementById('invitation-content').scrollIntoView({ behavior: 'smooth' });
    if (!isPlaying && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleRsvpSubmit = async (response) => {
    setRsvpLoading(true);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_token: visitorToken, visitor_name: visitorName, response })
      });
      if (res.ok) {
        setRsvpStatus(response);
        setRsvpSuccess(true);
        showToast("RSVP saved successfully ❤️");
        setTimeout(() => setRsvpSuccess(false), 2000);
      } else {
        showToast("Unable to save. Please try again.");
      }
    } catch {
      showToast("Something went wrong. Please retry.");
    }
    setRsvpLoading(false);
  };

  const handleGenderSubmit = async (selection) => {
    if (genderVote) return;
    setGenderLoading(true);
    try {
      const res = await fetch('/api/gender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_token: visitorToken, selection })
      });
      if (res.ok) {
        setGenderVote(selection);
        setGenderResults(prev => {
          const updatedBoy = selection === 'boy' ? (prev.boy || 0) + 1 : (prev.boy || 0);
          const updatedGirl = selection === 'girl' ? (prev.girl || 0) + 1 : (prev.girl || 0);
          return { boy: updatedBoy, girl: updatedGirl, total: updatedBoy + updatedGirl };
        });
        showToast("Gender prediction recorded!");
      } else {
        const data = await res.json();
        showToast(data.error || "Unable to save.");
      }
    } catch {
      showToast("Please retry.");
    }
    setGenderLoading(false);
  };

  const handleArrivalSubmit = async (selected_month) => {
    if (arrivalVote) return;
    setArrivalLoading(true);
    try {
      const res = await fetch('/api/arrival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_token: visitorToken, selected_month })
      });
      if (res.ok) {
        setArrivalVote(selected_month);
        setArrivalResults(prev => {
          const aug = (prev.August || 0) + (selected_month === 'August' ? 1 : 0);
          const sep = (prev.September || 0) + (selected_month === 'September' ? 1 : 0);
          const oct = (prev.October || 0) + (selected_month === 'October' ? 1 : 0);
          return { August: aug, September: sep, October: oct, total: aug + sep + oct };
        });
        showToast("Arrival month recorded!");
      } else {
        const data = await res.json();
        showToast(data.error || "Unable to save.");
      }
    } catch {
      showToast("Please retry.");
    }
    setArrivalLoading(false);
  };

  const handleBabyNameSubmit = async (e) => {
    e.preventDefault();
    const name = babyNameInput.trim();
    if (name.length < 2 || name.length > 40) {
      showToast("Baby name must be between 2 and 40 letters.");
      return;
    }
    setBabyNameLoading(true);
    try {
      const res = await fetch('/api/babyname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_token: visitorToken, visitor_name: visitorName, mobile_number: mobileNumber, suggested_name: name, language })
      });
      if (res.ok) {
        setBabyNameSuccess(true);
        showToast("Baby name suggestion received! ❤️");
        setBabyNameInput('');
        setTimeout(() => setBabyNameSuccess(false), 2500);
      } else {
        const data = await res.json();
        showToast(data.error || "Unable to save.");
      }
    } catch {
      showToast("Something went wrong. Please retry.");
    }
    setBabyNameLoading(false);
  };

  const totalGenderVotes = (genderResults.boy || 0) + (genderResults.girl || 0);
  const boyPercent = totalGenderVotes > 0 ? Math.round(((genderResults.boy || 0) / totalGenderVotes) * 100) : 0;
  const girlPercent = totalGenderVotes > 0 ? Math.round(((genderResults.girl || 0) / totalGenderVotes) * 100) : 0;

  const arrivalMonths = ['August', 'September', 'October'];
  const totalArrivalVotes = arrivalMonths.reduce((acc, m) => acc + (arrivalResults[m] || 0), 0);

  const t = {
    EN: {
      sub: "A Baby Shower Celebration",
      title: "Our Little Miracle",
      quote: `"Every little heartbeat...\nEvery tiny kick...\nEvery dream...\n\nhas brought us to this beautiful day."`,
      inviteText: "With immense joy in our hearts,",
      inviteHeading: "we invite you to celebrate our Baby Shower",
      inviteSub: "and bless our little miracle.",
      countdownSub: "Counting Every Heartbeat",
      countdownTitle: "Until we celebrate",
      venueHeading: "Venue",
      venueSub: "We would be delighted to celebrate this special day with you.",
      venueCardTitle: "Baby Shower Celebration",
      venueCardDate: "Sunday, 2 August 2026",
      venueCardTime: "5:30 PM onwards",
      venueCardHost: "Anto ❤️ Keerthi",
      venueBtn: "View Venue",
      callBtn: "Call",
      waBtn: "WhatsApp",
      rsvpHeading: "Will you be joining us?",
      rsvpSub: "Your response helps us prepare better.",
      yesBtn: "Yes",
      maybeBtn: "Maybe",
      noBtn: "Sorry, Can't Attend",
      genderHeading: "What do you think our little miracle will be?",
      teamBoy: "💙 Team Boy",
      teamGirl: "🩷 Team Girl",
      arrivalHeading: "When do you think our little miracle will arrive?",
      babyNameHeading: "Accept Suggestion",
      babyNameSub: "We would love to hear your suggestions.",
      babyNamePlaceholder: "Your baby name idea...",
      sendBtn: "Accept Suggestion",
      welcomeTag: "Welcome to Our Joy",
      welcomeTitle: "Please Enter Your Details",
      nameInput: "Your Name",
      phoneInput: "Phone Number (10 digits)",
      beginBtn: "Let's Begin"
    },
    TA: {
      sub: "வளைகாப்பு விழா அழைப்பு",
      title: "எங்கள் சிறிய அற்புதம்",
      quote: `"ஒவ்வொரு இதயத்துடிப்பும்...\nஒவ்வொரு சிறு உதைப்பும்...\nஒவ்வொரு கனவும்...\n\nஎங்களை இந்த அழகிய நாளுக்கு அழைத்து வந்துள்ளது."`,
      inviteText: "எங்கள் உள்ளத்தில் பெருமகிழ்ச்சியுடன்,",
      inviteHeading: "எங்கள் வளைகாப்பு விழாவிற்கு உங்களை அழைக்கிறோம்",
      inviteSub: "எங்கள் குட்டி வாரிசுக்கு உங்கள் ஆசிகளை வழங்குங்கள்.",
      countdownSub: "இதயத்துடிப்பு கவுண்டவுன்",
      countdownTitle: "கொண்டாட்டத்திற்கு இன்னும்",
      venueHeading: "நிகழ்ச்சி நடைபெறும் இடம்",
      venueSub: "இந்த மகிழ்ச்சியான நாளை உங்களுடன் கொண்டாட ஆவலுடன் காத்திருக்கிறோம்.",
      venueCardTitle: "வளைகாப்பு விழா",
      venueCardDate: "ஞாயிறு, ஆகஸ்ட் 2, 2026",
      venueCardTime: "மாலை 5:30 மணி முதல்",
      venueCardHost: "அந்தோணி ❤️ கீர்த்தி",
      venueBtn: "இடத்தைக் காண்க",
      callBtn: "அழைப்பு",
      waBtn: "வாட்ஸ்அப்",
      rsvpHeading: "நீங்கள் எங்களுடன் கலந்து கொள்வீர்களா?",
      rsvpSub: "உங்கள் பதில் எங்களுக்கு சிறந்த ஏற்பாடுகளை செய்ய உதவும்.",
      yesBtn: "ஆம்",
      maybeBtn: "ஒருவேளை",
      noBtn: "வர இயலாது",
      genderHeading: "எங்கள் சிறிய அதிசயம் யார் என்று நினைக்கிறீர்கள்?",
      teamBoy: "💙 Team Boy",
      teamGirl: "🩷 Team Girl",
      arrivalHeading: "எப்போது குழந்தை பிறக்கும் என்று நினைக்கிறீர்கள்?",
      babyNameHeading: "Accept Suggestion",
      babyNameSub: "உங்கள் அழகான பெயர் பரிந்துரைகளை அறிய விரும்புகிறோம்.",
      babyNamePlaceholder: "உங்கள் பெயர் யோசனை...",
      sendBtn: "Accept Suggestion",
      welcomeTag: "எங்கள் மகிழ்ச்சியில் இணையுங்கள்",
      welcomeTitle: "உங்கள் விவரங்களை உள்ளிடவும்",
      nameInput: "உங்கள் பெயர்",
      phoneInput: "தொலைபேசி எண் (10 இலக்கங்கள்)",
      beginBtn: "Let's Begin"
    }
  }[language];

  return (
    <div className={`bg-[#FDF9F3] md:bg-[#EAE4D9]/40 text-neutral-800 font-sans selection:bg-[#E6D5B8] selection:text-[#4A1525] flex justify-center items-center min-h-screen ${!isUnlocked ? 'h-screen overflow-hidden' : ''}`}>
      <div className="w-full max-w-[480px] md:max-w-[640px] lg:max-w-[768px] bg-[#FDF9F3] md:shadow-2xl md:my-6 md:rounded-[40px] relative overflow-hidden flex flex-col h-full md:h-[94vh] border-0 md:border border-[#E6D5B8]/40">
        
        {toastMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#4A1525] text-white px-4 py-2 rounded-full text-xs shadow-xl border border-[#E6D5B8]/40 animate-bounce">
            {toastMessage}
          </div>
        )}

        {isUnlocked && <audio ref={audioRef} src="/music.mp3" preload="auto" loop />}

        <AnimatePresence>
          {!isUnlocked && (
            <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 z-50 bg-[#4A1525] text-white flex flex-col justify-between p-6 sm:p-12 overflow-y-auto">
              <div className="flex justify-end pt-2">
                <div className="bg-white/10 p-1 rounded-full flex gap-1 border border-white/25">
                  <button onClick={() => setLanguage('EN')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${language === 'EN' ? 'bg-[#E6D5B8] text-[#4A1525] font-bold' : 'text-white/70'}`}>English</button>
                  <button onClick={() => setLanguage('TA')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${language === 'TA' ? 'bg-[#E6D5B8] text-[#4A1525] font-bold' : 'text-white/70'}`}>தமிழ்</button>
                </div>
              </div>

              <div className="my-auto text-center py-6 max-w-md mx-auto w-full">
                <span className="text-xs uppercase tracking-[3px] text-[#E6D5B8] mb-2 block">{t.welcomeTag}</span>
                <h1 className="font-serif text-3xl sm:text-5xl italic mb-6">{t.welcomeTitle}</h1>

                <form onSubmit={handleUnlock} className="space-y-4 text-left bg-white/5 p-6 sm:p-8 rounded-3xl border border-white/15 shadow-xl backdrop-blur-sm">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#E6D5B8] mb-1.5">{t.nameInput}</label>
                    <input type="text" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} placeholder="e.g. Antony" required className="w-full bg-white/10 border border-white/20 p-3.5 sm:p-4 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#E6D5B8]" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#E6D5B8] mb-1.5">{t.phoneInput}</label>
                    <input type="tel" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} placeholder="9876543210" required className="w-full bg-white/10 border border-white/20 p-3.5 sm:p-4 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#E6D5B8]" />
                  </div>
                  <button type="submit" className="w-full bg-[#E6D5B8] text-[#4A1525] font-bold py-4 rounded-xl text-sm tracking-wider shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2 mt-2">
                    {t.beginBtn} <ChevronRight size={16} />
                  </button>
                </form>
              </div>

              <div className="text-center text-[10px] tracking-widest text-[#E6D5B8]/60 pb-2">Anto & Keerthi · 02.08.2026</div>
            </motion.div>
          )}
        </AnimatePresence>

        {isUnlocked && (
          <div className="overflow-y-auto h-full scroll-smooth">
            <button onClick={toggleAudio} className="fixed md:absolute bottom-6 right-6 z-40 bg-[#4A1525] text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-[#E6D5B8]/55 transition-transform active:scale-95">
              {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
            </button>

            <section className="relative h-[85vh] sm:h-[90vh] w-full bg-cover bg-center flex flex-col justify-end p-6 sm:p-12 text-[#4A1525] text-center" style={{ backgroundImage: `url('/hero.jpg')` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#FDF9F3]/90 via-[#FDF9F3]/35 to-transparent z-0" />
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="relative z-10 flex flex-col items-center mb-6 max-w-lg mx-auto">
                <p className="text-xs text-[#4A1525] font-medium mb-1 tracking-widest">Welcome {visitorName} 👋 · Guest #{visitorNumber}</p>
                <span className="text-xs uppercase tracking-[3px] text-[#4A1525] font-semibold mb-3">{t.sub}</span>
                <h1 className="font-serif text-5xl sm:text-7xl font-normal italic mb-4 text-[#4A1525]">{t.title}</h1>
                <div className="flex items-center gap-3 text-lg tracking-wider mb-8 text-[#4A1525]">
                  <span>Anto</span> <Heart size={14} className="fill-[#4A1525]" /> <span>Keerthi</span>
                </div>
                <button onClick={scrollToContent} className="bg-[#4A1525] text-white border border-[#E6D5B8]/40 px-8 py-3.5 rounded-full text-sm tracking-wider flex items-center gap-2 shadow-xl hover:brightness-110 transition-all">
                  {t.beginBtn} <ChevronRight size={16} />
                </button>
              </motion.div>
            </section>

            <div id="invitation-content" className="py-16 px-6 sm:px-12 text-center max-w-2xl mx-auto">
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="font-serif italic text-xl sm:text-3xl leading-relaxed text-[#4A1525] mb-12 whitespace-pre-line">
                {t.quote}
              </motion.p>

              <div className="bg-white p-3 sm:p-4 rounded-[36px] shadow-xl mb-12 border border-[#E6D5B8]/30">
                <img src="/couple-bw.jpg" alt="Anto and Keerthi" className="w-full rounded-[28px] object-cover max-h-[500px]" />
                <p className="font-serif italic text-neutral-500 mt-4 text-lg sm:text-xl">{language === 'EN' ? 'A quiet little world of our own' : 'எங்கள் சிறிய அழகிய உலகம்'}</p>
              </div>

              <div className="text-base sm:text-xl leading-relaxed mb-12">
                {t.inviteText}
                <strong className="block font-serif text-3xl sm:text-5xl font-normal text-[#4A1525] my-4">{t.inviteHeading}</strong>
                {t.inviteSub}
              </div>

              <div className="text-xs uppercase tracking-[3px] text-neutral-400 mb-1">{t.countdownSub}</div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#4A1525] mb-6">{t.countdownTitle}</h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
                {[
                  { label: language === 'EN' ? 'Days' : 'நாட்கள்', val: timeLeft.days },
                  { label: language === 'EN' ? 'Hours' : 'மணி', val: timeLeft.hours },
                  { label: language === 'EN' ? 'Minutes' : 'நிமிடங்கள்', val: timeLeft.minutes },
                  { label: language === 'EN' ? 'Seconds' : 'நொடிகள்', val: timeLeft.seconds },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#EAE4D9] p-5 sm:p-6 rounded-2xl shadow-sm">
                    <div className="font-serif text-3xl sm:text-4xl font-semibold text-[#4A1525]">{String(item.val).padStart(2, '0')}</div>
                    <div className="text-[10px] tracking-[2px] uppercase text-neutral-400 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 mb-16">2 August 2026 · 5:30 PM · Asia/Kolkata</p>

              {/* VENUE SECTION */}
              <div className="mb-16">
                <h2 className="font-serif text-3xl sm:text-4xl text-[#4A1525] mb-2">{t.venueHeading}</h2>
                <p className="text-xs sm:text-sm text-neutral-600 mb-8 max-w-[360px] mx-auto">{t.venueSub}</p>

                <div className="bg-white/90 backdrop-blur-md rounded-[36px] p-6 sm:p-10 shadow-xl border border-[#E6D5B8] text-left relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-[#E6D5B8]/20 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#4A1525] font-semibold mb-4">📍 {language === 'EN' ? 'Venue' : 'இடம்'}</div>
                  <h3 className="font-serif text-2xl sm:text-3xl text-[#4A1525] mb-6">{t.venueCardTitle}</h3>

                  <div className="space-y-4 mb-8 text-sm sm:text-base text-neutral-700">
                    <div className="flex items-center gap-4">
                      <span className="text-xl">📅</span>
                      <div>
                        <strong className="block text-xs uppercase text-neutral-400 tracking-wider">Sunday</strong>
                        <span>{t.venueCardDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xl">🕠</span>
                      <div>
                        <strong className="block text-xs uppercase text-neutral-400 tracking-wider">Time</strong>
                        <span>{t.venueCardTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-3 border-t border-[#F0EAE1]">
                      <span className="text-xl">❤️</span>
                      <div>
                        <strong className="block text-xs uppercase text-neutral-400 tracking-wider">Hosted by</strong>
                        <span className="font-serif italic font-medium text-[#4A1525] text-base sm:text-lg">{t.venueCardHost}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => window.open('https://maps.app.goo.gl/GZAP28NED5qXYkWd6', '_blank')} className="flex-1 bg-gradient-to-r from-[#4A1525] to-[#6E2338] text-white py-4 rounded-full text-sm font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all">
                      <MapPin size={16} /> {t.venueBtn}
                    </button>
                    <div className="grid grid-cols-2 sm:flex gap-3">
                      <button onClick={() => window.location.href='tel:+919150962686'} className="bg-white border border-[#E6D5B8] text-[#4A1525] px-6 py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-[#4A1525] hover:text-white active:scale-[0.98] transition-all">
                        <Phone size={15} /> {t.callBtn}
                      </button>
                      <button onClick={() => window.open('https://wa.me/919150962686?text=Hi%20Anto%20%26%20Keerthi,%20We%20are%20excited%20to%20attend%20your%20Baby%20Shower.', '_blank')} className="bg-white border border-[#E6D5B8] text-[#4A1525] px-6 py-3.5 rounded-full text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:bg-[#4A1525] hover:text-white active:scale-[0.98] transition-all">
                        <MessageCircle size={15} /> {t.waBtn}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RSVP SECTION */}
              <div className="bg-white rounded-[36px] p-6 sm:p-10 shadow-xl mb-16 border border-[#E6D5B8]/30 text-left">
                <h3 className="font-serif text-2xl sm:text-3xl text-[#4A1525] mb-1">{t.rsvpHeading}</h3>
                <p className="text-xs sm:text-sm text-neutral-500 mb-6">{t.rsvpSub}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'yes', label: t.yesBtn, icon: '✅' },
                    { id: 'maybe', label: t.maybeBtn, icon: '❓' },
                    { id: 'no', label: t.noBtn, icon: '❌' },
                  ].map((opt) => (
                    <button key={opt.id} disabled={rsvpLoading} onClick={() => handleRsvpSubmit(opt.id)} className={`w-full py-4 px-5 rounded-2xl text-sm font-medium flex items-center justify-between sm:justify-center sm:gap-2 border transition-all active:scale-[0.98] ${rsvpStatus === opt.id ? 'bg-[#4A1525] text-white border-[#4A1525] shadow-md' : 'bg-[#FDF9F3] text-neutral-700 border-[#EAE4D9] hover:border-[#4A1525]'}`}>
                      <span className="flex items-center gap-3"><span className="text-base">{opt.icon}</span> {opt.label}</span>
                      {rsvpLoading && rsvpStatus === opt.id ? <Loader2 size={16} className="animate-spin" /> : rsvpStatus === opt.id ? <Check size={16} className="text-[#E6D5B8]" /> : null}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {rsvpSuccess && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-4 bg-[#FDF9F3] rounded-2xl text-center border border-[#E6D5B8] text-xs sm:text-sm text-[#4A1525]">
                      {language === 'EN' ? `Thank you ${visitorName} for your response ❤️` : `நன்றி ${visitorName} ❤️`}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* GENDER PREDICTION */}
              <div className="bg-white rounded-[36px] p-6 sm:p-10 shadow-xl mb-16 border border-[#E6D5B8]/30 text-left">
                <h3 className="font-serif text-2xl sm:text-3xl text-[#4A1525] mb-6">{t.genderHeading}</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { id: 'boy', label: t.teamBoy },
                    { id: 'girl', label: t.teamGirl },
                  ].map((opt) => (
                    <button key={opt.id} disabled={genderLoading || genderVote !== ''} onClick={() => handleGenderSubmit(opt.id)} className={`py-4 sm:py-5 rounded-2xl text-sm sm:text-base font-medium border text-center transition-all active:scale-[0.98] ${genderVote === opt.id ? 'bg-[#4A1525] text-white border-[#4A1525] shadow-md' : 'bg-[#FDF9F3] text-neutral-700 border-[#EAE4D9] hover:border-[#4A1525]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-[#F0EAE1]">
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm text-neutral-600 mb-1.5">
                      <span>💙 Team Boy</span>
                      <span>{boyPercent}% ({genderResults.boy || 0} votes)</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden"><div className="bg-blue-400 h-full transition-all duration-1000" style={{ width: `${boyPercent}%` }} /></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm text-neutral-600 mb-1.5">
                      <span>🩷 Team Girl</span>
                      <span>{girlPercent}% ({genderResults.girl || 0} votes)</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden"><div className="bg-pink-400 h-full transition-all duration-1000" style={{ width: `${girlPercent}%` }} /></div>
                  </div>
                </div>
              </div>

              {/* ARRIVAL MONTH PREDICTION */}
              <div className="bg-white rounded-[36px] p-6 sm:p-10 shadow-xl mb-16 border border-[#E6D5B8]/30 text-left">
                <h3 className="font-serif text-2xl sm:text-3xl text-[#4A1525] mb-6">{t.arrivalHeading}</h3>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {arrivalMonths.map((month) => (
                    <button key={month} disabled={arrivalLoading || arrivalVote !== ''} onClick={() => handleArrivalSubmit(month)} className={`py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-medium border text-center transition-all ${arrivalVote === month ? 'bg-[#4A1525] text-white border-[#4A1525] shadow-md' : 'bg-[#FDF9F3] text-neutral-700 border-[#EAE4D9]'}`}>
                      {month}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-[#F0EAE1]">
                  {arrivalMonths.map((m) => {
                    const votes = arrivalResults[m] || 0;
                    const pct = totalArrivalVotes > 0 ? Math.round((votes / totalArrivalVotes) * 100) : 0;
                    return (
                      <div key={m}>
                        <div className="flex justify-between text-xs sm:text-sm text-neutral-600 mb-1.5">
                          <span>{m}</span>
                          <span>{pct}% ({votes} votes)</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden"><div className="bg-[#4A1525] h-full transition-all duration-1000" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-3 sm:p-4 rounded-[36px] shadow-xl mb-16 border border-[#E6D5B8]/35">
                <img src="/mom-solo.jpg" alt="Keerthi" className="w-full rounded-[28px] object-cover max-h-[500px]" />
                <p className="font-serif italic text-neutral-500 mt-4 text-lg sm:text-xl">{language === 'EN' ? 'Awaiting our little miracle' : 'எங்கள் சிறிய அற்புதத்திற்காக காத்திருக்கிறோம்'}</p>
              </div>

            </div>

            {/* BABY NAME SUGGESTION */}
            <section className="bg-[#4A1525] text-white py-16 px-6 sm:px-12 text-center rounded-t-[40px]">
              <div className="max-w-lg mx-auto">
                <p className="text-[10px] uppercase tracking-[2px] text-[#E6D5B8] mb-2">{t.babyNameHeading}</p>
                <h2 className="font-serif text-3xl sm:text-4xl mb-2">{t.babyNameSub}</h2>
                <p className="text-xs sm:text-sm text-[#E6D5B8] mb-8">{language === 'EN' ? "Your words become part of our miracle's first story." : 'உங்கள் வார்த்தைகள் எங்கள் குழந்தையின் முதல் கதையின் ஒரு பகுதியாகும்.'}</p>

                <form onSubmit={handleBabyNameSubmit} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#E6D5B8] mb-2">{language === 'EN' ? 'Suggest a Beautiful Baby Name' : 'அழகான குழந்தை பெயரை பரிந்துரைக்கவும்'}</label>
                    <input type="text" value={babyNameInput} onChange={(e) => setBabyNameInput(e.target.value)} placeholder={t.babyNamePlaceholder} required className="w-full bg-white/5 border border-white/20 p-4 rounded-xl text-sm sm:text-base text-white placeholder-white/30 focus:outline-none focus:border-[#E6D5B8]" />
                  </div>
                  <button type="submit" disabled={babyNameLoading} className="w-full bg-[#E6D5B8] text-[#4A1525] font-semibold py-4 rounded-xl text-sm sm:text-base tracking-wider shadow-lg hover:brightness-105 transition-all flex items-center justify-center gap-2">
                    {babyNameLoading ? <Loader2 size={16} className="animate-spin" /> : <>{t.sendBtn} <Mail size={16} /></>}
                  </button>
                </form>

                <AnimatePresence>
                  {babyNameSuccess && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-6 p-4 bg-white/10 rounded-2xl text-center border border-white/20 text-xs sm:text-sm text-[#E6D5B8]">
                      ❤️ {language === 'EN' ? `Thank You ${visitorName}\nYour beautiful suggestion has been received.` : `நன்றி ${visitorName}\nஉங்கள் பெயர் பரிந்துரை பதிவு செய்யப்பட்டது.`}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            <footer className="bg-[#23172B] text-white/60 py-10 px-6 text-center text-xs sm:text-sm">
              <p className="text-[10px] uppercase tracking-[2px] text-[#E6D5B8] mb-2">{language === 'EN' ? "We can't wait to celebrate with you." : "உங்களுடன் கொண்டாட நாங்கள் ஆவலுடன் காத்திருக்கிறோம்."}</p>
              <h3 className="font-serif text-2xl sm:text-3xl text-white italic mb-3">Anto & Keerthi</h3>
              <p className="text-[10px] tracking-widest">02 · 08 · 2026</p>
            </footer>

          </div>
        )}

      </div>
    </div>
  );
}