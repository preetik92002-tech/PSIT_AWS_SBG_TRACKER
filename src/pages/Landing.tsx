import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Building2,
  Calendar,
  FolderGit2,
  Trophy,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Globe2,
  Github,
  ExternalLink,
  ChevronRight,
  Code2,
  Compass,
  Cpu,
  Layers,
  Crown,
  Share2,
  Award,
  Video,
  BookOpen,
  GitPullRequest,
  Check,
  Activity,
  Flame,
  Terminal,
  LucideIcon,
} from 'lucide-react'
import { AWSLogo } from '@/components/ui/AWSLogo'
import { CommunityImage } from '@/components/ui/CommunityImage'
import { BuilderAvatar } from '@/components/ui/BuilderAvatar'
import { AWSBuilderBadgeCard } from '@/components/badges/AWSBuilderBadgeCard'
import { OFFICIAL_AWS_BUILDER_BADGES_CATALOG } from '@/types/awsBadges'
import { trackEvent } from '@/utils/analytics'

// ─── Journey Stages Data ───────────────────────────────────────────────────
interface StoryStep {
  id: string
  sectionId: string
  title: string
  subtitle: string
  tag: string
  icon: LucideIcon
}

const STORY_STEPS: StoryStep[] = [
  { id: 'profile', sectionId: 'section-profile', tag: 'Stage 01', title: 'Create Profile', subtitle: 'Craft your verified builder identity', icon: Users },
  { id: 'community', sectionId: 'section-community', tag: 'Stage 02', title: 'Join Community', subtitle: 'Connect to your campus chapter', icon: Building2 },
  { id: 'learn', sectionId: 'section-learn', tag: 'Stage 03', title: 'Learn', subtitle: 'Follow guided cloud curriculum', icon: BookOpen },
  { id: 'build', sectionId: 'section-build', tag: 'Stage 04', title: 'Build', subtitle: 'Deploy serverless & cloud architectures', icon: Code2 },
  { id: 'contribute', sectionId: 'section-contribute', tag: 'Stage 05', title: 'Contribute', subtitle: 'Peer mentorship & unblocking members', icon: GitPullRequest },
  { id: 'events', sectionId: 'section-events', tag: 'Stage 06', title: 'Events', subtitle: 'Workshops & Community Live sessions', icon: Video },
  { id: 'growth', sectionId: 'section-growth', tag: 'Stage 07', title: 'Track Growth', subtitle: 'XP, metrics & AWS Builder badges', icon: Trophy },
  { id: 'world', sectionId: 'section-world', tag: 'Stage 08', title: 'Builder World', subtitle: 'Live digital avatar ecosystem', icon: Globe2 },
]

export const Landing: React.FC = () => {
  const navigate = useNavigate()
  const [activeStageId, setActiveStageId] = useState<string>('profile')

  // Track initial landing page view
  useEffect(() => {
    trackEvent('landing_page_view')
  }, [])

  const handleHeroCreateProfile = () => {
    trackEvent('hero_cta_clicked')
    trackEvent('create_profile_clicked')
    navigate('/signup')
  }

  const handleCreateProfile = () => {
    trackEvent('create_profile_clicked')
    navigate('/signup')
  }

  const handleJoinCommunity = () => {
    trackEvent('join_community_clicked')
    navigate('/auth/join-community')
  }

  const handleScrollToSection = (sectionId: string, stageId?: string) => {
    if (stageId) {
      setActiveStageId(stageId)
      trackEvent(`${stageId}_story_viewed` as any)
    }
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#080A0F] text-slate-100 font-sans selection:bg-[#FF9900]/20 selection:text-[#FF9900] overflow-x-hidden relative">
      {/* Background Technical Grid System */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION BAR                                          */}
      {/* ============================================================== */}
      <header className="relative z-40 w-full border-b border-slate-800/80 bg-[#0A0E17]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-3">
          <AWSLogo size="xs" variant="inverted" />
          <span className="font-mono font-bold text-sm tracking-tight text-white flex items-center gap-2">
            <span>Community Manager</span>
            <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-[#FF9900] border border-orange-500/30 font-semibold">
              BUILDER CENTER INSPIRED
            </span>
          </span>
        </div>

        <nav className="hidden lg:flex items-center gap-1 font-mono text-xs text-slate-400">
          {STORY_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleScrollToSection(step.sectionId, step.id)}
              className="px-2.5 py-1 rounded-md hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              {step.title}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="text-xs font-mono text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>
          <button
            type="button"
            onClick={handleHeroCreateProfile}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <span>Create Profile</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* SECTION 1: HERO SECTION                                        */}
      {/* ============================================================== */}
      <section className="relative z-10 pt-14 sm:pt-20 pb-16 px-4 sm:px-8 max-w-6xl mx-auto text-center space-y-6">
        {/* Technical Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 text-[11px] font-mono text-slate-300 shadow-sm animate-live-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#FF9900] animate-pulse" />
          <span>Official Platform for AWS Student Builder Chapters</span>
        </div>

        {/* Core Message Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-mono font-extrabold tracking-tight text-white uppercase leading-tight max-w-4xl mx-auto">
          BUILD. LEARN. GROW. <span className="text-[#FF9900]">TOGETHER.</span>
        </h1>

        {/* Supporting Concept Narrative */}
        <div className="space-y-2 max-w-2xl mx-auto">
          <p className="text-base sm:text-lg font-mono text-slate-300 font-semibold tracking-tight">
            Track what you learn. Track what you build. Track how you contribute. See how you grow.
          </p>
          <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed">
            A developer-first community workspace where campus builders complete hands-on AWS milestones, collaborate on serverless deployments, host live workshops, and unlock verified AWS Builder Center credentials.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg mx-auto">
          <button
            type="button"
            onClick={handleHeroCreateProfile}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>CREATE YOUR PROFILE</span>
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            onClick={() => handleScrollToSection('section-community')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-mono font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Compass size={14} className="text-[#FF9900]" />
            <span>EXPLORE COMMUNITY</span>
          </button>

          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <span>SIGN IN</span>
          </Link>
        </div>

        {/* Builder Journey Stage Rail */}
        <div className="pt-10">
          <div className="border border-slate-800 bg-[#0A0E17]/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xs shadow-xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <span className="text-[11px] font-mono text-[#FF9900] font-bold uppercase tracking-wider flex items-center gap-2">
                <Terminal size={14} />
                <span>THE 8-STAGE BUILDER LIFECYCLE</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Click any stage to inspect</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
              {STORY_STEPS.map((step, idx) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleScrollToSection(step.sectionId, step.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    activeStageId === step.id
                      ? 'border-[#FF9900] bg-orange-500/10 text-white shadow-xs'
                      : 'border-slate-800/80 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[9px] text-slate-500 uppercase">{step.tag}</div>
                  <div className="text-xs font-bold truncate text-slate-200 mt-0.5">{step.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: CREATE PROFILE (Stage 01)                           */}
      {/* ============================================================== */}
      <section id="section-profile" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
              STAGE 01 • BUILDER IDENTITY
            </div>
            <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
              Create Your Digital Builder Profile
            </h2>
            <p className="text-sm font-sans text-slate-300 leading-relaxed">
              Craft your verified identity with academic affiliation, custom avatar, and AWS Builder Center alias. As you complete milestones and assist peers, your builder character advances from Level 1 to Level 10+.
            </p>

            <div className="space-y-2.5 pt-2 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Distinctive digital builder character connected to Builder World</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Verified academic institution & chapter membership</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Live AWS Builder Alias integration with badge synchronization</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleCreateProfile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs"
              >
                <span>CREATE YOUR PROFILE</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Interactive Profile Visual */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl space-y-4 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-[#FF9900] font-bold uppercase tracking-wider">
                  BUILDER IDENTITY CARD
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Verified
              </span>
            </div>

            <div className="flex items-center gap-4">
              <BuilderAvatar
                name="Aditya Sharma"
                alias="cloudarchitect"
                size="xl"
                isManager={true}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-mono font-bold text-white truncate">Aditya Sharma</h3>
                <p className="text-xs font-mono text-[#FF9900]">@cloudarchitect</p>
                <p className="text-xs text-slate-400 mt-0.5">PSIT Kanpur • Computer Science</p>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-500/15 text-[#FF9900] border border-orange-500/30 text-[10px] font-mono font-semibold mt-1.5">
                  <Flame size={11} />
                  <span>Level 4 Builder • 1,850 XP</span>
                </div>
              </div>
            </div>

            {/* Level XP Progress */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-slate-400">Progression to Level 5</span>
                <span className="text-slate-200 font-bold">1,850 / 2,500 XP</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#FF9900] to-amber-400 h-full rounded-full w-[74%]" />
              </div>
            </div>

            {/* Attached Skills */}
            <div className="pt-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                Attached Cloud Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['AWS Lambda', 'Bedrock GenAI', 'AWS CDK', 'DynamoDB', 'FastAPI', 'S3 Architecture'].map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/80 text-[11px] font-mono text-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: JOIN COMMUNITY (Stage 02)                           */}
      {/* ============================================================== */}
      <section id="section-community" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Chapter Preview Card */}
          <div className="order-2 lg:order-1 p-6 rounded-2xl border border-orange-500/30 bg-[#0F172A] shadow-xl space-y-5 max-w-md mx-auto w-full">
            <div className="flex items-start gap-4">
              <CommunityImage
                name="AWS Student Builder Group PSIT Kanpur"
                shortName="PSIT"
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF9900] font-bold block mb-1">
                  OFFICIAL CAMPUS CHAPTER
                </span>
                <h3 className="text-sm sm:text-base font-mono font-bold text-white truncate">
                  AWS Student Builder Group PSIT Kanpur
                </h3>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  Pranveer Singh Institute of Technology
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Kanpur, India • Established 2026
                </p>
              </div>
            </div>

            {/* Join Code Box */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Chapter Join Code</span>
                <span className="text-base font-bold text-white tracking-widest">PSIT-AWS-2026</span>
              </div>
              <span className="px-2.5 py-1 rounded bg-orange-500/10 text-[#FF9900] border border-orange-500/30 text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            {/* Chapter Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-base font-bold text-white">20</span>
                <span className="text-[10px] text-slate-400">Builders</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-base font-bold text-[#FF9900]">12</span>
                <span className="text-[10px] text-slate-400">Projects</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="block text-base font-bold text-emerald-400">8</span>
                <span className="text-[10px] text-slate-400">Live Events</span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
              STAGE 02 • INSTITUTIONAL MEMBERSHIP
            </div>
            <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
              One Community Tracker per Campus Chapter
            </h2>
            <p className="text-sm font-sans text-slate-300 leading-relaxed">
              Every institution runs under one verified chapter workspace. Students join with a single institutional code or QR invite, preventing fragmented groups and giving leaders full visibility over cohort progress.
            </p>

            <div className="space-y-2.5 pt-2 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Single institutional source of truth for faculty & student leads</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Instant cohort onboarding via unique chapter code</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Shared project repositories, event calendars, and leaderboard</span>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={handleJoinCommunity}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs"
              >
                <span>JOIN COMMUNITY</span>
                <ArrowRight size={13} />
              </button>
              <Link
                to="/auth/create-community"
                className="text-xs font-mono text-slate-300 hover:text-white px-3 py-2 border border-slate-700/80 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Create New Chapter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4: LEARN ROADMAP (Stage 03)                            */}
      {/* ============================================================== */}
      <section id="section-learn" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
            STAGE 03 • GUIDED CURRICULUM
          </div>
          <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
            Curated AWS Learning Roadmap
          </h2>
          <p className="text-sm font-sans text-slate-400">
            Step-by-step technical progression from core cloud practitioner foundations to generative AI and serverless systems.
          </p>
        </div>

        {/* Milestone Progress KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-3xl mx-auto font-mono text-center">
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-2xl font-bold text-[#FF9900]">82%</span>
            <span className="text-xs text-slate-400 block mt-1">AWS Milestone Progress</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-2xl font-bold text-emerald-400">24</span>
            <span className="text-xs text-slate-400 block mt-1">Tasks Completed</span>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0F172A]">
            <span className="text-2xl font-bold text-blue-400">12</span>
            <span className="text-xs text-slate-400 block mt-1">Workshops Attended</span>
          </div>
        </div>

        {/* 5-Stage Curriculum Progression */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs">
          {[
            { step: '01', title: 'AWS Foundations', desc: 'IAM security, S3 storage, EC2 compute, VPC basics', progress: 100, tag: 'COMPLETED' },
            { step: '02', title: 'Serverless Systems', desc: 'AWS Lambda, API Gateway, DynamoDB tables', progress: 85, tag: 'IN PROGRESS' },
            { step: '03', title: 'Infra as Code', desc: 'AWS CDK v2, CloudFormation, GitHub Actions', progress: 60, tag: 'IN PROGRESS' },
            { step: '04', title: 'Live Deployments', desc: 'Full-stack cloud applications with DNS and CI/CD', progress: 40, tag: 'IN PROGRESS' },
            { step: '05', title: 'GenAI & Bedrock', desc: 'Amazon Bedrock, Claude 3.5 Sonnet, RAG pipelines', progress: 15, tag: 'NEXT UP' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-800 bg-[#0F172A] space-y-2 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[#FF9900] font-bold">{item.step}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    item.progress === 100
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.tag}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white">{item.title}</h4>
                <p className="text-[11px] text-slate-400 font-sans leading-snug mt-1">{item.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#FF9900] h-full rounded-full"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block text-right">
                  {item.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 5: BUILD PROJECTS (Stage 04)                           */}
      {/* ============================================================== */}
      <section id="section-build" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
              STAGE 04 • HANDS-ON ENGINEERING
            </div>
            <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
              Deploy Real Cloud Architectures
            </h2>
            <p className="text-sm font-sans text-slate-300 leading-relaxed">
              Move beyond theory. Chapter members team up on real cloud engineering projects, connect GitHub repositories, deploy serverless backends, and showcase functional live demos to the community.
            </p>

            <div className="space-y-2.5 pt-2 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Direct GitHub repository linkage & commit tracking</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Multi-member team roles (Lead, Backend, DevOps, AI Engineer)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Milestone deliverables verified for chapter XP</span>
              </div>
            </div>
          </div>

          {/* Featured Project Cards Showcase */}
          <div className="space-y-4">
            {/* Project 1: NetSentinel AI */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0F172A] shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[10px] font-mono text-[#FF9900] font-bold uppercase tracking-wider">
                  FEATURED PROJECT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Active • 4 Members
                </span>
              </div>

              <div>
                <h3 className="text-sm font-mono font-bold text-white">NetSentinel AI</h3>
                <p className="text-xs font-sans text-slate-400 mt-1 leading-relaxed">
                  Real-time VPC flow log anomaly detector powered by AWS Lambda streaming and Amazon Bedrock security analysis.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['Python', 'AWS Lambda', 'Bedrock AI', 'VPC Flow Logs', 'AWS CDK'].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                    {t}
                  </span>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Milestone Progress</span>
                  <span className="text-[#FF9900] font-bold">80%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#FF9900] to-amber-400 h-full rounded-full w-[80%]" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Github size={13} />
                  <span>psit/netsentinel-ai</span>
                </span>
                <span className="text-[#FF9900] font-bold hover:underline cursor-pointer">Live Demo →</span>
              </div>
            </div>

            {/* Project 2: CloudCost Optimizer */}
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0F172A] shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                  SERVERLESS FINOPS
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  In Review • 3 Members
                </span>
              </div>

              <div>
                <h3 className="text-sm font-mono font-bold text-white">CloudCost Optimizer</h3>
                <p className="text-xs font-sans text-slate-400 mt-1 leading-relaxed">
                  Automated campus lab resource scheduler shutting down idle EC2 instances and RDS snapshots via AWS Step Functions.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['TypeScript', 'Step Functions', 'DynamoDB', 'EventBridge'].map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                    {t}
                  </span>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Milestone Progress</span>
                  <span className="text-blue-400 font-bold">95%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full w-[95%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 6: CONTRIBUTE (Stage 05)                               */}
      {/* ============================================================== */}
      <section id="section-contribute" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
            STAGE 05 • PEER MENTORSHIP
          </div>
          <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
            Track How You Contribute
          </h2>
          <p className="text-sm font-sans text-slate-400">
            A vibrant community flourishes when builders assist builders. Every code review, architectural unblock, and peer guide awards verified contribution points.
          </p>
        </div>

        {/* Contribution Workflow Diagram */}
        <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-[#0F172A] max-w-3xl mx-auto shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center font-mono text-center">
            {/* Step 1: Member A */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <BuilderAvatar name="Riya Patel" alias="riyac" size="md" isManager={true} />
              <div>
                <h4 className="text-xs font-bold text-white">Riya Patel</h4>
                <p className="text-[10px] text-[#FF9900]">Senior Peer Mentor</p>
                <p className="text-[10px] text-slate-400 mt-1">Unblocks Lambda VPC Timeout</p>
              </div>
            </div>

            {/* Transition Arrow 1 */}
            <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
              <ArrowRight size={20} className="text-[#FF9900] rotate-90 sm:rotate-0" />
              <span className="text-[10px] font-mono">1-on-1 Code Review</span>
            </div>

            {/* Step 2: Member B */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <BuilderAvatar name="Kunal Verma" alias="kunalv" size="md" />
              <div>
                <h4 className="text-xs font-bold text-white">Kunal Verma</h4>
                <p className="text-[10px] text-slate-300">Cohort Member</p>
                <p className="text-[10px] text-slate-400 mt-1">Tasks Milestone Solved</p>
              </div>
            </div>
          </div>

          {/* Outcome Verification Banner */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>Contribution verified by Chapter Lead & logged to activity feed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                +150 Mentor XP
              </span>
              <span className="px-3 py-1 rounded-md bg-orange-500/10 text-[#FF9900] border border-orange-500/30 font-bold">
                +50 Solver XP
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 7: EVENTS & COMMUNITY LIVE (Stage 06)                  */}
      {/* ============================================================== */}
      <section id="section-events" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
              STAGE 06 • COMMUNITY LIVE
            </div>
            <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
              Google Meet Live Sessions for Every Chapter
            </h2>
            <p className="text-sm font-sans text-slate-300 leading-relaxed">
              Host cloud architecture walk-throughs, hackathon orientations, and live lab workshops. Members join verified Google Meet video sessions directly from the chapter event calendar.
            </p>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 font-mono text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white">Google Meet Integration</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Built-in chapter calendar links, attendee tracking, and live participant attendance records.
              </p>
            </div>
          </div>

          {/* Live Event Visual Card */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl space-y-4 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ● LIVE • Google Meet
              </span>
              <span className="text-[10px] font-mono text-slate-400">Hands-on Lab</span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[#FF9900] uppercase tracking-wider block mb-0.5">
                AWS CHAPTER WORKSHOP
              </span>
              <h3 className="text-base font-mono font-bold text-white">
                Serverless Deployments & Amazon Bedrock
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-1">Saturday · 6:00 PM IST · 45 mins remaining</p>
            </div>

            {/* Attendees Stack */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div className="flex items-center -space-x-2">
                {['Aarav', 'Riya', 'Kunal', 'Pooja'].map((name, i) => (
                  <BuilderAvatar key={i} name={name} size="sm" className="border-2 border-[#0F172A]" />
                ))}
                <span className="text-[10px] font-mono text-slate-400 pl-3">+18 attendees</span>
              </div>

              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-xl bg-[#FF9900] text-slate-950 text-xs font-mono font-bold shadow-xs hover:bg-[#EC7211] transition-all"
              >
                Join Session →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 8: TRACK GROWTH (Stage 07)                             */}
      {/* ============================================================== */}
      <section id="section-growth" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
            STAGE 07 • GROWTH & AWS BADGES
          </div>
          <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
            See How You Grow — Verified AWS Badges
          </h2>
          <p className="text-sm font-sans text-slate-400">
            Every learning module, deployed architecture, and chapter contribution converts into real builder progress and verified AWS Builder Center credentials.
          </p>
        </div>

        {/* Growth Dashboard Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Chapter KPI Tracker */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl space-y-4 font-mono">
            <span className="text-[10px] text-[#FF9900] uppercase font-bold tracking-wider block">
              CHAPTER TELEMETRY
            </span>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-300">Total Chapter XP</span>
                <span className="text-base font-bold text-[#FF9900]">18,450 XP</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-300">Tasks Verified</span>
                <span className="text-base font-bold text-emerald-400">142</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-300">Active Repositories</span>
                <span className="text-base font-bold text-blue-400">12</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-300">Live Workshops</span>
                <span className="text-base font-bold text-amber-400">28</span>
              </div>
            </div>

            {/* Mini Leaderboard preview */}
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">
                Chapter Leaderboard
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60">
                  <span className="text-amber-400 font-bold">#1 @cloudarchitect</span>
                  <span className="text-slate-300 font-bold">1,850 XP</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60">
                  <span className="text-slate-400 font-bold">#2 @riyac</span>
                  <span className="text-slate-300 font-bold">1,720 XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* AWS Builder Center Badges Display */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-800 bg-[#0F172A] shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AWSLogo size="xs" variant="inverted" />
                <span className="text-xs font-mono font-bold text-white">
                  AWS BUILDER CENTER BADGES
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-[#FF9900] border border-orange-500/30">
                Synchronized
              </span>
            </div>

            <p className="text-xs font-sans text-slate-400">
              Showcase authentic AWS credentials. Badges reflect official architectural accomplishments, learning tracks, and community contributions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {OFFICIAL_AWS_BUILDER_BADGES_CATALOG.slice(0, 4).map((badge) => (
                <AWSBuilderBadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 9: BUILDER WORLD (Stage 08)                            */}
      {/* ============================================================== */}
      <section id="section-world" className="relative z-10 py-16 px-4 sm:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
              STAGE 08 • VISUAL ECOSYSTEM
            </div>
            <h2 className="text-2xl sm:text-4xl font-mono font-bold text-white tracking-tight">
              Live Digital Canvas for Your Chapter
            </h2>
            <p className="text-sm font-sans text-slate-300 leading-relaxed">
              Builder World turns your campus cohort into an interactive digital universe. Managers are distinguished with official crowns, active builders gather on technical coordinate grids, and inspecting any avatar reveals their recent deployments and XP activity.
            </p>

            <div className="space-y-2.5 pt-2 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-2.5">
                <Crown size={15} className="text-[#FF9900] shrink-0" />
                <span>Chapter Manager distinguished with golden official crown</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Flame size={15} className="text-[#FF9900] shrink-0" />
                <span>Weekly XP velocity and active builder heat rings</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Activity size={15} className="text-emerald-400 shrink-0" />
                <span>Interactive character inspection without third-party LEGO assets</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  trackEvent('builder_world_opened')
                  navigate('/signup')
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] transition-all cursor-pointer shadow-xs"
              >
                <span>ENTER BUILDER WORLD</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Builder World Canvas Visualization */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-[#060810] shadow-xl space-y-4 max-w-md mx-auto w-full relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none opacity-30"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(30, 45, 80, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 45, 80, 0.4) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />

            <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono text-[#FF9900] font-bold">
                  BUILDER WORLD CANVAS
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">PSIT Chapter Grid</span>
            </div>

            {/* Simulating Avatars on the Canvas */}
            <div className="relative z-10 py-8 flex items-center justify-center gap-6">
              {/* Manager */}
              <div className="text-center space-y-1.5 group cursor-pointer">
                <span className="text-[9px] font-mono text-amber-400 font-bold block flex items-center justify-center gap-1">
                  <Crown size={10} className="text-amber-400" />
                  <span>LEAD</span>
                </span>
                <div className="relative inline-block">
                  <div className="absolute -inset-1 rounded-full bg-amber-500/20 blur-xs animate-pulse" />
                  <BuilderAvatar name="Aditya Sharma" size="lg" isManager={true} />
                </div>
                <span className="block text-[11px] font-mono font-bold text-white">@cloudarchitect</span>
                <span className="text-[9px] font-mono text-emerald-400 block">Deploying CDK</span>
              </div>

              {/* Senior Builder */}
              <div className="text-center space-y-1.5 group cursor-pointer">
                <span className="text-[9px] font-mono text-slate-500 font-bold block">
                  BUILDER
                </span>
                <BuilderAvatar name="Riya Patel" size="md" />
                <span className="block text-[11px] font-mono font-bold text-slate-200">@riyac</span>
                <span className="text-[9px] font-mono text-[#FF9900] block">Bedrock Lab</span>
              </div>

              {/* Cohort Member */}
              <div className="text-center space-y-1.5 group cursor-pointer">
                <span className="text-[9px] font-mono text-slate-500 font-bold block">
                  BUILDER
                </span>
                <BuilderAvatar name="Kunal Verma" size="md" />
                <span className="block text-[11px] font-mono font-bold text-slate-200">@kunalv</span>
                <span className="text-[9px] font-mono text-slate-400 block">IAM Review</span>
              </div>
            </div>

            <div className="relative z-10 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>Coordinate: [X: 142, Y: 88]</span>
              <span className="text-emerald-400 font-bold">20 Builders Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 10: FINAL CALL TO ACTION (CTA)                         */}
      {/* ============================================================== */}
      <section id="section-cta" className="relative z-10 py-24 px-4 sm:px-8 border-t border-slate-800/80 bg-gradient-to-b from-[#0A0E17] to-[#080A0F] text-center space-y-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-orange-500/10 border border-orange-500/30 text-[10px] font-mono font-bold text-[#FF9900]">
            START YOUR JOURNEY
          </div>
          <h2 className="text-3xl sm:text-5xl font-mono font-extrabold text-white tracking-tight uppercase">
            YOUR BUILDER JOURNEY STARTS HERE.
          </h2>
          <p className="text-sm sm:text-base text-slate-300 font-mono max-w-xl mx-auto">
            Build real projects, complete guided milestones, contribute to your campus chapter, and unlock verified AWS Builder credentials.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={handleCreateProfile}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-mono font-bold text-slate-950 bg-[#FF9900] hover:bg-[#EC7211] shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Users size={15} />
            <span>CREATE YOUR PROFILE</span>
          </button>

          <button
            type="button"
            onClick={handleJoinCommunity}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-mono font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 shadow-sm transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Building2 size={15} />
            <span>JOIN COMMUNITY</span>
          </button>
        </div>

        <div className="pt-2">
          <Link
            to="/login"
            className="text-xs font-mono text-slate-400 hover:text-white transition-colors"
          >
            Already registered? <span className="text-[#FF9900] underline">Sign in to your chapter</span>
          </Link>
        </div>
      </section>

      {/* ============================================================== */}
      {/* FOOTER                                                         */}
      {/* ============================================================== */}
      <footer className="relative z-10 w-full border-t border-slate-900 bg-[#060810] px-4 sm:px-8 py-8 text-xs font-mono text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <AWSLogo size="xs" variant="inverted" />
            <span className="font-bold text-slate-300">AWS Community Manager</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            {STORY_STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => handleScrollToSection(step.sectionId, step.id)}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                {step.title}
              </button>
            ))}
          </div>

          <div className="text-right text-[11px] text-slate-500">
            AWS Student Builder Community Platform
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
