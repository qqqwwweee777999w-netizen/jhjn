/* ===== src/components/DisciplineSystem.tsx ===== */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useDisciplineStore } from "@/hooks/useDisciplineStore";
import { APP_PASSWORD, AUTH_HEADER, AUTH_STORAGE_KEY } from "@/lib/auth-config";
import {
  prayers,
  dailyTasks,
  azkarMorning,
  azkarEvening,
  azkarSleep,
  exercises,
  meals,
  englishPlan,
  dangerItems,
  rewards,
  waterSchedule,
  alternativeExercises,
  motivationalQuotes,
} from "@/lib/data";
import { pickDaily } from "@/lib/daily";
import SavingsChallenge from "@/components/SavingsChallenge";
import RPGSystem from "@/components/RPGSystem";
import CodeVault from "@/components/CodeVault";
import ParticlesBackground from "@/components/ParticlesBackground";
import WeeklyReport from "@/components/WeeklyReport";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import PomodoroTimer from "@/components/PomodoroTimer";
import TypingTest from "@/components/TypingTest";
import WeightGoalCard from "@/components/WeightGoalCard";
import TiltCard from "@/components/TiltCard";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Crown,
  Flame,
  Scale,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  AlertTriangle,
  Cloud,
  MessageSquare,
  Send,
  Dumbbell,
  BookOpen,
  Utensils,
  Droplets,
  Moon,
  Sun,
  Timer,
  RefreshCw,
  Check,
  X,
  Award,
  Sparkles,
  Image as ImageIcon,
  LogOut,
} from "lucide-react";

// Ordered tab list — used for swipe nav + render
const TAB_ORDER = [
  { id: "tasks", icon: Sun, label: "المهام" },
  { id: "azkar", icon: Moon, label: "الأذكار" },
  { id: "exercise", icon: Dumbbell, label: "التمارين" },
  { id: "nutrition", icon: Utensils, label: "التغذية" },
  { id: "english", icon: BookOpen, label: "الإنجليزية" },
  { id: "weight", icon: Scale, label: "الوزن" },
  { id: "ai", icon: MessageSquare, label: "المساعد" },
  { id: "ai-control", icon: Zap, label: "AI المتحكم" },
  { id: "savings", icon: Sparkles, label: "الحصالة" },
  { id: "rpg", icon: Award, label: "🎮 RPG" },
  { id: "pomodoro", icon: Timer, label: "🍅 بومودورو" },
  { id: "typing", icon: Award, label: "⌨️ سرعة الكتابة" },
  { id: "weight-goal", icon: Scale, label: "🎯 هدف الوزن" },
  { id: "report", icon: Award, label: "📊 تقرير الأسبوع" },
  { id: "vault", icon: Award, label: "🔒 الأكواد" },
  { id: "settings", icon: Award, label: "المكافآت" },
] as const;

// Authed fetch — attaches password header
const authFetch = (input: RequestInfo, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set(AUTH_HEADER, APP_PASSWORD);
  return fetch(input, { ...init, headers });
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function DisciplineSystem() {
  const store = useDisciplineStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [azkarSubTab, setAzkarSubTab] = useState<"morning" | "evening" | "sleep">("morning");
  const [weather, setWeather] = useState<string>("جاري التحميل...");
  const [newTask, setNewTask] = useState("");
  const [importCode, setImportCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [calorieInput, setCalorieInput] = useState("");
  const [calorieLoading, setCalorieLoading] = useState(false);
  const [calorieResult, setCalorieResult] = useState<null | {
    items: Array<{ name: string; quantity: string; calories: number; protein: number; carbs: number; fats: number }>;
    total_calories: number; total_protein: number; total_carbs: number; total_fats: number; advice: string;
  }>(null);
  const [controlInput, setControlInput] = useState("");
  const [controlLoading, setControlLoading] = useState(false);
  const [controlHistory, setControlHistory] = useState<Array<{ role: "user" | "bot"; text: string; actions?: string[] }>>([]);
  const [maxMode, setMaxMode] = useState(true);
  const [quote] = useState(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sfx = useSoundEffects(true);
  const lastLevelRef = useRef(store.level);
  useEffect(() => {
    if (store.level > lastLevelRef.current) {
      sfx.levelUp();
      toast.success(`🎉 ارتقيت للمستوى ${store.level}!`);
    }
    lastLevelRef.current = store.level;
  }, [store.level, sfx]);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const today = store.getToday();

  // Timer logic
  useEffect(() => {
    if (store.timerRunning) {
      timerRef.current = setInterval(() => {
        store.setTimerSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [store.timerRunning]);

  // Weather fetch (local coordinates, location name hidden)
  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=21.9333&longitude=39.3667&current=temperature_2m,weather_code&timezone=Asia/Riyadh"
        );
        const data = await res.json();
        const temp = data.current?.temperature_2m;
        if (temp !== undefined) {
          setWeather(`☁️ الطقس: ${temp}°C - ${getWeatherDesc(data.current.weather_code)}`);
        }
      } catch {
        setWeather("☁️ الطقس: غير متوفر حالياً");
      }
    }
    fetchWeather();
  }, []);

  function getWeatherDesc(code: number): string {
    const map: Record<number, string> = {
      0: "سماء صافية", 1: "غائم جزئياً", 2: "غائم", 3: "غائم كلياً",
      45: "ضباب", 48: "ضباب", 51: "رذاذ", 61: "مطر", 71: "ثلوج",
      80: "مطر غزير", 95: "عواصف رعدية",
    };
    return map[code] || "غائم";
  }

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.chatHistory]);

  const sendChatText = async (text: string) => {
    if (!text || aiLoading) return;
    store.addChatMessage("user", text);
    setAiLoading(true);

    try {
      const history = [
        ...store.chatHistory.map((m) => ({
          role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        })),
        { role: "user" as const, content: text },
      ];

      const res = await authFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok || !res.body) {
        if (res.status === 429) toast.error("الطلبات كثيرة، جرب بعد قليل");
        else if (res.status === 402) toast.error("انتهى رصيد الذكاء الاصطناعي");
        else toast.error("خطأ في الاتصال بالمساعد");
        setAiLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      store.addChatMessage("bot", "");
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        store.updateLastBotMessage(acc);
      }
    } catch (e) {
      toast.error("تعذّر الاتصال بالمساعد");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    await sendChatText(text);
  };

  const handleQuickReply = async (text: string) => {
    if (aiLoading) return;
    await sendChatText(text);
  };



  const handleGenerateImage = async () => {
    const prompt = chatInput.trim();
    if (!prompt) { toast.error("اكتب وصف الصورة في الخانة فوق"); return; }
    if (aiLoading) return;
    store.addChatMessage("user", `🎨 ${prompt}`);
    setChatInput("");
    setAiLoading(true);
    try {
      const res = await authFetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error("الطلبات كثيرة، جرب بعد قليل");
        else if (res.status === 402) toast.error("انتهى رصيد توليد الصور");
        else toast.error("تعذّر توليد الصورة");
        return;
      }
      const data = (await res.json()) as { image: string };
      store.addChatImage(data.image, "✨ تفضل الصورة");
    } catch {
      toast.error("خطأ بالاتصال");
    } finally {
      setAiLoading(false);
    }
  };

  const handleLogout = () => {
    try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
    window.location.reload();
  };

  const handleGenerateExercise = () => {
    const ex = alternativeExercises[Math.floor(Math.random() * alternativeExercises.length)];
    toast.success(`تمرين بديل: ${ex}`, { duration: 5000 });
  };

  const handleCalculateCalories = async () => {
    const text = calorieInput.trim();
    if (!text || calorieLoading) return;
    setCalorieLoading(true);
    setCalorieResult(null);
    try {
      const res = await authFetch("/api/calories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: text }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error("الطلبات كثيرة، جرب بعد قليل");
        else if (res.status === 402) toast.error("انتهى رصيد الذكاء الاصطناعي");
        else toast.error("تعذّر حساب السعرات");
        return;
      }
      const data = await res.json();
      setCalorieResult(data);
    } catch {
      toast.error("خطأ بالاتصال");
    } finally {
      setCalorieLoading(false);
    }
  };

  // ===== AI Site Controller =====
  type Action = {
    type: string; tab?: string; id?: string; name?: string; index?: number;
    value?: boolean; time?: string; weight?: number; measurement?: number;
    notes?: string; count?: number;
  };

  const executeActions = (actions: Action[]): string[] => {
    const summary: string[] = [];
    for (const a of actions) {
      try {
        switch (a.type) {
          case "switch_tab":
            if (a.tab) { setActiveTab(a.tab); summary.push(`📂 فتحت ${a.tab}`); }
            break;
          case "toggle_prayer":
            if (a.id) { store.togglePrayer(a.id); summary.push(`🕌 صلاة ${a.id}`); }
            break;
          case "toggle_task": {
            const t = dailyTasks.find((x) => x.id === a.id);
            if (t) { store.toggleTask(t.id, t.xp); summary.push(`✅ ${t.name}`); }
            break;
          }
          case "add_custom_task":
            if (a.name) { store.addCustomTask(a.name); summary.push(`➕ ${a.name}`); }
            break;
          case "remove_custom_task":
            if (typeof a.index === "number") { store.removeCustomTask(a.index); summary.push(`🗑️ حذف مهمة`); }
            break;
          case "mark_exercise":
            store.markExercise(a.value ?? true); summary.push(`💪 تمرين ${a.value === false ? "إلغاء" : "✓"}`); break;
          case "mark_meal":
            store.markMeal(a.value ?? true); summary.push(`🍽️ وجبة ${a.value === false ? "إلغاء" : "✓"}`); break;
          case "mark_english":
            store.markEnglish(a.value ?? true); summary.push(`📚 إنجليزي ${a.value === false ? "إلغاء" : "✓"}`); break;
          case "mark_nutrition":
            store.markNutrition(a.value ?? true); summary.push(`🥗 تغذية ${a.value === false ? "إلغاء" : "✓"}`); break;
          case "next_day": store.nextDay(); summary.push(`⏭️ اليوم التالي`); break;
          case "prev_day": store.prevDay(); summary.push(`⏮️ اليوم السابق`); break;
          case "set_exercise_time":
            if (a.time) { store.setExerciseTime(a.time); summary.push(`⏰ موعد التمرين ${a.time}`); }
            break;
          case "claim_reward": {
            if (a.id) {
              const r = rewards.find((x) => x.id === a.id);
              if (r) {
                const ok = store.claimReward(r.id, r.cost);
                summary.push(ok ? `🎁 استبدلت ${r.name}` : `❌ XP ما يكفي لـ ${r.name}`);
              }
            }
            break;
          }
          case "report_violation":
            store.reportViolation(); summary.push(`⚠️ تم تسجيل مخالفة`); break;
          case "toggle_water":
            if (a.id) { store.toggleWater(a.id); summary.push(`💧 ${a.id}`); }
            break;
          case "increment_azkar":
            if (a.id && a.count) { store.incrementAzkar(a.id, a.count); summary.push(`📿 ${a.id}`); }
            break;
          case "add_weight":
            if (typeof a.weight === "number") {
              store.addWeight(a.weight, a.measurement ?? 0, a.notes ?? "");
              summary.push(`⚖️ سجلت ${a.weight}كجم`);
            }
            break;
          case "start_timer": store.setTimerRunning(true); summary.push(`▶️ مؤقت`); break;
          case "stop_timer": store.setTimerRunning(false); summary.push(`⏸️ مؤقت`); break;
          case "reset_timer": store.setTimerSeconds(0); store.setTimerRunning(false); summary.push(`🔄 مؤقت`); break;
        }
      } catch (e) {
        console.error("action error", a, e);
      }
    }
    return summary;
  };

  const handleControlSend = async () => {
    const text = controlInput.trim();
    if (!text || controlLoading) return;
    setControlHistory((h) => [...h, { role: "user", text }]);
    setControlInput("");
    setControlLoading(true);
    try {
      const messages = [
        ...controlHistory.map((m) => ({
          role: m.role === "bot" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        })),
        { role: "user" as const, content: text },
      ];
      const context = {
        day: store.day, level: store.level, totalXP: store.totalXP,
        streak: store.streak, currentWeight: store.currentWeight,
        activeTab, customTasksCount: store.customTasks.length,
      };
      const res = await authFetch("/api/ai-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, context, mode: maxMode ? "max" : "normal" }),
      });
      if (!res.ok) {
        if (res.status === 429) toast.error("الطلبات كثيرة، انتظر شوي");
        else if (res.status === 402) toast.error("انتهى رصيد الذكاء");
        else toast.error("خطأ في الـ AI المتحكم");
        return;
      }
      const data = (await res.json()) as { reply: string; actions: Action[] };
      const done = executeActions(data.actions || []);
      setControlHistory((h) => [...h, { role: "bot", text: data.reply, actions: done }]);
      if (done.length > 0) toast.success(`نفّذت ${done.length} أمر ⚡`);
    } catch {
      toast.error("تعذّر الاتصال");
    } finally {
      setControlLoading(false);
    }
  };



  // Daily progress %
  const totalTasksToday =
    prayers.length + dailyTasks.length + 4; // exercise, meal, english, nutrition
  const doneTasksToday =
    Object.values(today.prayers).filter(Boolean).length +
    Object.values(today.tasks).filter(Boolean).length +
    (today.exerciseDone ? 1 : 0) +
    (today.mealDone ? 1 : 0) +
    (today.englishDone ? 1 : 0) +
    (today.nutritionDone ? 1 : 0);
  const dailyProgress = Math.round((doneTasksToday / totalTasksToday) * 100);

  const xpNeeded = store.level * 500;
  const xpPercent = Math.min((store.totalXP / xpNeeded) * 100, 100);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-[#ffb703] text-lg animate-pulse">👑 جاري تحميل نظام تطوير الذات...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 relative" dir="rtl">
      <ParticlesBackground />
      <div className="relative z-10 mx-auto max-w-3xl rounded-2xl border-2 border-[#ffb703] p-4 neon-breathe" style={{ background: "linear-gradient(145deg, #070c18, #0f1a34)" }}>
        <ThemeSwitcher />
        {/* Header */}
        <div className="relative text-center border-b border-[rgba(255,183,3,0.3)] pb-3 mb-4">
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="absolute top-0 left-0 text-muted-foreground hover:text-[#ef4444] transition-colors p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-bold neon-text-gold neon-heading mb-2">👑 نظام تطوير الذات</h1>
          <div className="inline-flex items-center gap-2 rounded-lg border border-[#00d2ff] bg-[rgba(0,210,255,0.1)] px-3 py-1.5 text-xs">
            <Cloud className="w-4 h-4 text-[#00d2ff]" />
            {weather}
          </div>
          <div className="mt-3 rounded-lg border border-[rgba(255,183,3,0.4)] bg-[rgba(255,183,3,0.05)] px-3 py-2 text-xs text-[#ffb703] italic">
            💭 {quote}
          </div>
        </div>


        {/* Status Box */}
        <div className="status-box-bg rounded-xl p-4 mb-4">
          {/* Day Controls */}
          <div className="flex items-center justify-between bg-[#111a2e] rounded-lg p-2 mb-3 border border-[#1e2e4a]">
            <Button onClick={store.prevDay} disabled={store.day <= 1} variant="outline" size="sm" className="border-[#00d2ff] text-[#00d2ff] hover:bg-[#00d2ff]/10">
              <ChevronRight className="w-4 h-4 ml-1" /> السابق
            </Button>
            <span className="font-bold text-lg">اليوم: {store.day} / 90</span>
            <Button onClick={store.nextDay} disabled={store.day >= 90} variant="outline" size="sm" className="border-[#00d2ff] text-[#00d2ff] hover:bg-[#00d2ff]/10">
              التالي <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>

          {/* Stats Grid — 3D hologram tilt */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <TiltCard className="stat-card-bg rounded-lg p-3 text-center cursor-default">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-[#ef4444]" />
                <span className="text-xs text-muted-foreground">الستريك 🔥</span>
              </div>
              <span className="text-lg font-bold neon-text-gold">{store.streak} أيام</span>
            </TiltCard>
            <TiltCard className="stat-card-bg rounded-lg p-3 text-center cursor-default">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Crown className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="text-xs text-muted-foreground">المستوى 👑</span>
              </div>
              <span className="text-lg font-bold neon-text-gold">{store.level}</span>
            </TiltCard>
            <TiltCard className="stat-card-bg rounded-lg p-3 text-center cursor-default">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Scale className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-xs text-muted-foreground">أحدث ميزان ⚖️</span>
              </div>
              <span className="text-lg font-bold neon-text-gold">{store.currentWeight > 0 ? `${store.currentWeight} كجم` : "غير مسجل"}</span>
            </TiltCard>
          </div>

          {/* XP Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#00d2ff]">تقدّم المستوى</span>
              <span className="text-[#ffb703]">{Math.round(xpPercent)}%</span>
            </div>
            <div className="xp-bar-bg rounded-full h-3.5 overflow-hidden">
              <div className="xp-bar-fill h-full rounded-full transition-all duration-500" style={{ width: `${xpPercent}%` }} />
            </div>
            <div className="text-center text-xs text-muted-foreground mt-1">
              XP: {store.totalXP} / {xpNeeded} (المستوى التالي)
            </div>
          </div>

          {/* Daily Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#39ff14]">إنجاز اليوم 🎯</span>
              <span className="text-[#39ff14]">{doneTasksToday} / {totalTasksToday} ({dailyProgress}%)</span>
            </div>
            <div className="bg-[#0a1224] rounded-full h-2 overflow-hidden border border-[#1e2e4a]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dailyProgress}%`, background: "linear-gradient(90deg, #39ff14, #00d2ff)" }} />
            </div>
          </div>
        </div>


        {/* Main Tabs — swipe right/left to navigate */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div
            onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              const start = swipeStartX.current;
              if (start == null) return;
              const dx = e.changedTouches[0].clientX - start;
              swipeStartX.current = null;
              if (Math.abs(dx) < 60) return;
              const idx = TAB_ORDER.findIndex((t) => t.id === activeTab);
              if (idx < 0) return;
              // RTL layout: swipe right (dx > 0) → previous tab; swipe left → next
              const nextIdx = dx > 0 ? idx - 1 : idx + 1;
              if (nextIdx >= 0 && nextIdx < TAB_ORDER.length) setActiveTab(TAB_ORDER[nextIdx].id);
            }}
          >
            <div className="flex items-center gap-1 mb-4">
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  const idx = TAB_ORDER.findIndex((t) => t.id === activeTab);
                  if (idx > 0) setActiveTab(TAB_ORDER[idx - 1].id);
                }}
                className="shrink-0 h-9 w-9 border-[#1e2e4a] bg-[#131e36] text-[#00d2ff] hover:border-[#00d2ff]"
                title="القسم السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <ScrollArea className="flex-1 whitespace-nowrap">
                <TabsList className="inline-flex bg-transparent p-0 gap-1" style={{ minWidth: "max-content" }}>
                  {TAB_ORDER.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#ffb703] data-[state=active]:to-[#d49a00] data-[state=active]:text-black data-[state=active]:shadow-[0_0_10px_rgba(255,183,3,0.3)] data-[state=active]:border-[#ffb703] border border-[#1e2e4a] bg-[#131e36] text-[#a0aec0] rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  const idx = TAB_ORDER.findIndex((t) => t.id === activeTab);
                  if (idx < TAB_ORDER.length - 1) setActiveTab(TAB_ORDER[idx + 1].id);
                }}
                className="shrink-0 h-9 w-9 border-[#1e2e4a] bg-[#131e36] text-[#00d2ff] hover:border-[#00d2ff]"
                title="القسم التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>


          {/* Tasks Tab */}
          <TabsContent value="tasks" className="animate-fade-in">
            {/* Work Timer */}
            <div className="card-bg rounded-xl p-4 mb-4" style={{ background: "linear-gradient(135deg, #16122c, #0d1527)", borderColor: "#8a2be2" }}>
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-5 h-5 text-[#8a2be2]" />
                <span className="font-bold text-sm">💼 مؤقت شفت كاشير شوايتي (12 ساعة)</span>
              </div>
              <div className="text-center mb-3">
                <div className="text-3xl font-mono font-bold text-[#00d2ff]">{formatTime(store.timerSeconds)}</div>
                <div className="text-xs text-muted-foreground mt-1">{store.timerRunning ? "الشفت قيد التشغيل" : "الشفت بانتظار التشغيل"}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => store.setTimerRunning(!store.timerRunning)}
                  className="flex-1 bg-[#00d2ff] text-black hover:bg-[#00d2ff]/80 font-bold text-xs"
                >
                  {store.timerRunning ? <Pause className="w-4 h-4 ml-1" /> : <Play className="w-4 h-4 ml-1" />}
                  {store.timerRunning ? "إيقاف" : "تشغيل المؤقت"}
                </Button>
                <Button onClick={() => { store.setTimerSeconds(0); store.setTimerRunning(false); }} variant="outline" className="border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Prayers */}
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3 flex items-center gap-2">
                <Moon className="w-4 h-4" /> 🕌 الصلوات الخمس المفروضة (+10 XP لكل صلاة)
              </h3>
              <div className="space-y-2">
                {prayers.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg p-3 transition-all border-r-3 ${
                      today.prayers[p.id] ? "border-r-[#39ff14] bg-[rgba(57,255,20,0.04)]" : "border-r-[#00d2ff] bg-[rgba(3,7,18,0.4)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!today.prayers[p.id]}
                        onCheckedChange={() => store.togglePrayer(p.id)}
                        className="border-[#00d2ff] data-[state=checked]:bg-[#39ff14] data-[state=checked]:border-[#39ff14]"
                      />
                      <span className={`text-sm ${today.prayers[p.id] ? "line-through text-muted-foreground" : ""}`}>
                        <span className="font-bold text-[#00d2ff]">{p.name}</span> {p.label}
                      </span>
                    </div>
                    <span className="text-xs text-[#ffb703] font-bold">+{p.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Tasks */}
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">📌 المهام اليومية الأساسية</h3>
              <div className="space-y-2">
                {dailyTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between rounded-lg p-3 transition-all border-r-3 ${
                      today.tasks[t.id] ? "border-r-[#39ff14] bg-[rgba(57,255,20,0.04)]" : "border-r-[#00d2ff] bg-[rgba(3,7,18,0.4)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!today.tasks[t.id]}
                        onCheckedChange={() => store.toggleTask(t.id, t.xp)}
                        className="border-[#00d2ff] data-[state=checked]:bg-[#39ff14] data-[state=checked]:border-[#39ff14]"
                      />
                      <span className={`text-sm ${today.tasks[t.id] ? "line-through text-muted-foreground" : ""}`}>{t.name}</span>
                    </div>
                    <span className="text-xs text-[#ffb703] font-bold">+{t.xp} XP</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Tasks */}
            <div className="card-bg rounded-xl p-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">⚔️ المهام المخصصة</h3>
              <div className="space-y-2 mb-3">
                {store.customTasks.map((task, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-lg p-3 transition-all border-r-3 ${
                      today.customTasks[i] ? "border-r-[#39ff14] bg-[rgba(57,255,20,0.04)]" : "border-r-[#00d2ff] bg-[rgba(3,7,18,0.4)]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!today.customTasks[i]}
                        onCheckedChange={() => store.toggleCustomTask(String(i))}
                        className="border-[#00d2ff] data-[state=checked]:bg-[#39ff14] data-[state=checked]:border-[#39ff14]"
                      />
                      <span className={`text-sm ${today.customTasks[i] ? "line-through text-muted-foreground" : ""}`}>{task}</span>
                    </div>
                    <Button onClick={() => store.removeCustomTask(i)} variant="ghost" size="sm" className="text-[#ef4444] hover:text-[#ef4444] p-1 h-auto">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      store.addCustomTask(newTask);
                      setNewTask("");
                    }
                  }}
                  placeholder="مهمة جديدة..."
                  className="bg-[#060913] border-[#1e2e4a] text-white text-xs"
                />
                <Button
                  onClick={() => { store.addCustomTask(newTask); setNewTask(""); }}
                  className="bg-[#ffb703] text-black hover:bg-[#ffb703]/80 font-bold text-xs"
                >
                  <Plus className="w-4 h-4" /> إضافة
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Azkar Tab */}
          <TabsContent value="azkar" className="animate-fade-in">
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">📿 حصن المسلم التفاعلي (+20 XP لكل قسم مكتمل)</h3>
              <div className="flex gap-2 mb-4">
                {(["morning", "evening", "sleep"] as const).map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setAzkarSubTab(sub)}
                    className={`flex-1 rounded-md py-2 px-3 text-xs font-bold transition-all border ${
                      azkarSubTab === sub ? "bg-[#8a2be2] border-[#a855f7] text-white" : "bg-[#16223f] border-[#233863] text-white"
                    }`}
                  >
                    {sub === "morning" ? "🌅 الصباح" : sub === "evening" ? "🌆 المساء" : "🛌 النوم"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {(azkarSubTab === "morning" ? azkarMorning : azkarSubTab === "evening" ? azkarEvening : azkarSleep).map((zkr) => {
                  const currentCount = today.azkar[zkr.id] ?? 0;
                  const isDone = currentCount >= zkr.count;
                  return (
                    <div
                      key={zkr.id}
                      onClick={() => store.incrementAzkar(zkr.id, zkr.count)}
                      className={`cursor-pointer rounded-lg p-3 transition-all border flex flex-col gap-2 ${
                        isDone ? "border-[#39ff14] bg-[rgba(57,255,20,0.03)]" : "border-[#1e2e4a] bg-[rgba(13,21,39,0.7)] hover:border-[#00d2ff]"
                      }`}
                    >
                      <p className={`text-sm leading-relaxed ${isDone ? "text-muted-foreground" : "text-[#f3f4f6]"}`}>{zkr.text}</p>
                      <div className="self-end bg-[#1e293b] text-[#ffb703] px-3 py-1 rounded-full text-xs font-bold border border-[#2d3748]">
                        {currentCount} / {zkr.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Exercise Tab */}
          <TabsContent value="exercise" className="animate-fade-in">
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">🏋️ خطة التدريب اليومية</h3>
              <div className="rounded-lg border border-dashed border-[#ffb703] bg-[rgba(255,183,3,0.05)] p-3 mb-3">
                <label className="text-xs block mb-2">⚙️ تعديل موعد التمرين المفضل:</label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={store.exerciseTime}
                    onChange={(e) => store.setExerciseTime(e.target.value)}
                    className="bg-[#060913] border-[#1e2e4a] text-white text-center text-sm w-32"
                  />
                  <Button onClick={() => toast.success(`تم تحديث الموعد إلى ${store.exerciseTime}`)} variant="outline" size="sm" className="border-[#00d2ff] text-[#00d2ff]">
                    <RefreshCw className="w-3 h-3 ml-1" /> تحديث
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-[#8a2be2] p-3 mb-4 text-center" style={{ background: "linear-gradient(135deg, #16122c, #0d1527)" }}>
                <div className="text-sm mb-2">🤖 مولّد التمارين البديلة الفوري الذكي:</div>
                <Button onClick={handleGenerateExercise} className="bg-[#8a2be2] hover:bg-[#8a2be2]/80 text-white text-xs">
                  <Zap className="w-4 h-4 ml-1" /> توليد تمرين بديل مخصص حسب طاقتك اليوم ⚡
                </Button>
              </div>

              <div className="text-[11px] text-muted-foreground mb-2 text-center">💡 اضغط على التمرين بعد ما تخلصه عشان تكسب +8 XP (مرة واحدة في اليوم)</div>
              <div className="space-y-3 mb-4">
                {exercises.map((ex) => {
                  const claimed = !!today.exerciseClaims?.[ex.id];
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        const ok = store.claimExerciseXP(ex.id, 8);
                        if (ok) toast.success(`+8 XP — ${ex.name} 💪`);
                        else toast.info("سجّلت هذا التمرين اليوم بالفعل ✅");
                      }}
                      className={`w-full text-right rounded-lg overflow-hidden border transition-all active:scale-[0.99] ${
                        claimed ? "border-[#39ff14] bg-[rgba(57,255,20,0.06)]" : "border-[#1e2e4a] bg-[rgba(3,7,18,0.5)] hover:border-[#00d2ff]"
                      }`}
                    >
                      <img src={ex.image} alt={ex.name} loading="lazy" width={512} height={512} className="w-full h-32 object-cover" />
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-sm font-bold text-[#00d2ff]">{ex.name}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${claimed ? "bg-[#39ff14]/20 text-[#39ff14]" : "bg-[#ffb703]/20 text-[#ffb703]"}`}>
                            {claimed ? "✓ +8 XP" : "+8 XP"}
                          </span>
                        </div>
                        <div className="text-xs text-[#ffb703] mb-2">⚡ {ex.sets} مجموعات × {ex.reps}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{ex.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>



              <div className="flex items-center justify-between bg-[#111a2e] rounded-lg p-3 border border-[#1e2e4a]">
                <span className="text-sm">✅ أنهيت كامل الحصة الرياضية</span>
                <Checkbox
                  checked={today.exerciseDone}
                  onCheckedChange={(c) => store.markExercise(!!c)}
                  className="border-[#00d2ff] data-[state=checked]:bg-[#39ff14] data-[state=checked]:border-[#39ff14]"
                />
              </div>
            </div>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="animate-fade-in">
            {/* AI Calorie Calculator */}
            <div className="rounded-xl border-2 border-[#39ff14] p-4 mb-4" style={{ background: "linear-gradient(135deg, #0a1a0a, #0d1527)", boxShadow: "0 0 15px rgba(57,255,20,0.15)" }}>
              <h3 className="text-[#39ff14] font-bold text-sm mb-2 flex items-center gap-2">
                🤖 حاسبة السعرات الذكية (AI)
              </h3>
              <p className="text-xs text-muted-foreground mb-3">اكتب أي وجبة بالعربي والـ AI يحسبك السعرات والماكروز</p>
              <div className="flex gap-2 mb-3">
                <Input
                  value={calorieInput}
                  onChange={(e) => setCalorieInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCalculateCalories(); }}
                  placeholder="مثال: شاورما دجاج صغيرة + كولا"
                  className="bg-[#040812] border-[#39ff14]/40 text-white text-xs flex-1"
                />
                <Button onClick={handleCalculateCalories} disabled={calorieLoading} className="bg-[#39ff14] text-black hover:bg-[#39ff14]/80 font-bold text-xs">
                  {calorieLoading ? "..." : "احسب ⚡"}
                </Button>
              </div>
              {calorieResult && (
                <div className="bg-[#040812] rounded-lg p-3 border border-[#1e2e4a] text-xs space-y-2">
                  {calorieResult.items.map((it, i) => (
                    <div key={i} className="flex justify-between border-b border-[#1e2e4a] pb-1">
                      <span>{it.name} <span className="text-muted-foreground">({it.quantity})</span></span>
                      <span className="text-[#ffb703]">{it.calories} سعرة</span>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                    <div className="bg-[#1e2e4a] rounded p-1"><div className="text-[10px]">سعرات</div><div className="text-[#ffb703] font-bold">{calorieResult.total_calories}</div></div>
                    <div className="bg-[#1e2e4a] rounded p-1"><div className="text-[10px]">بروتين</div><div className="text-[#00d2ff] font-bold">{calorieResult.total_protein}g</div></div>
                    <div className="bg-[#1e2e4a] rounded p-1"><div className="text-[10px]">كارب</div><div className="text-[#39ff14] font-bold">{calorieResult.total_carbs}g</div></div>
                    <div className="bg-[#1e2e4a] rounded p-1"><div className="text-[10px]">دهون</div><div className="text-[#ef4444] font-bold">{calorieResult.total_fats}g</div></div>
                  </div>
                  <div className="bg-[rgba(57,255,20,0.05)] border border-[#39ff14]/30 rounded p-2 text-[#39ff14] leading-relaxed">💡 {calorieResult.advice}</div>
                </div>
              )}
            </div>

            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-1">🍏 قائمة الأكل المعتمدة (لا تخرج عنها)</h3>
              <p className="text-xs text-muted-foreground mb-3">اختر وجبة واحدة فقط من كل قسم. هذي القائمة الكاملة المسموح بها خلال الـ 90 يوم.</p>

              {([
                { key: "breakfast", title: "🌅 الفطور (اختر واحد)", color: "#ffb703" },
                { key: "snack", title: "🍎 سناك الدوام / المدرسة", color: "#39ff14" },
                { key: "lunch", title: "🍗 الغداء (اختر واحد)", color: "#00d2ff" },
                { key: "dinner", title: "🌙 العشاء (اختر واحد) — خفيف", color: "#a855f7" },
              ] as const).map((section) => (
                <div key={section.key} className="mb-4">
                  <h4 className="font-bold text-xs mb-2 px-2 py-1 rounded" style={{ color: section.color, background: `${section.color}15`, borderRight: `3px solid ${section.color}` }}>
                    {section.title}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {meals.filter((m) => m.category === section.key).map((meal) => (
                      <div key={meal.id} className="rounded-lg overflow-hidden bg-[rgba(3,7,18,0.5)] border border-[#1e2e4a] hover:border-[#ffb703] transition-all hover:scale-[1.01]">
                        <img src={meal.image} alt={meal.name} loading="lazy" width={512} height={256} className="w-full h-24 object-cover" />
                        <div className="p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: section.color, color: "#000" }}>{meal.letter}</span>
                            <div className="text-xs font-bold text-[#ffb703]">{meal.name}</div>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{meal.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}



              <h3 className="text-[#00d2ff] font-bold text-sm mb-3 flex items-center gap-2">
                <Droplets className="w-4 h-4" /> 💧 جدول شرب الماء
              </h3>
              <div className="flex justify-around bg-[rgba(0,210,255,0.03)] p-3 rounded-lg border border-[rgba(0,210,255,0.1)] mb-4">
                {waterSchedule.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => store.toggleWater(w.id)}
                    className={`text-2xl transition-all ${today.water[w.id] ? "" : "grayscale"}`}
                  >
                    <div className="text-center">
                      <div className={`${today.water[w.id] ? "scale-110" : "scale-100"} transition-transform`}>{w.emoji}</div>
                      <div className="text-[10px] mt-1 text-muted-foreground">{w.label}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-[#111a2e] rounded-lg p-3 border border-[#1e2e4a]">
                <span className="text-sm">🍏 التزمت بوجبات اليوم وابتعدت عن المقليات</span>
                <Checkbox
                  checked={today.nutritionDone}
                  onCheckedChange={(c) => store.markNutrition(!!c)}
                  className="border-[#00d2ff] data-[state=checked]:bg-[#39ff14] data-[state=checked]:border-[#39ff14]"
                />
              </div>
            </div>
          </TabsContent>

          {/* English Tab */}
          <TabsContent value="english" className="animate-fade-in">
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">📚 خطة تطوير اللغة والاستماع اليومي</h3>
              <div className="space-y-2 mb-4">
                {englishPlan.map((plan, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-3 border-r-3 ${
                      store.day >= parseInt(plan.day.split("-")[0].replace("اليوم ", "")) ? "border-r-[#39ff14]" : "border-r-[#00d2ff]"
                    } bg-[rgba(3,7,18,0.4)]`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-bold text-[#00d2ff] flex items-center gap-2">
                        <span className="text-2xl">{plan.icon}</span>
                        {plan.day}
                      </div>
                      <div className="text-xs text-[#ffb703]">+{plan.xp} XP</div>
                    </div>
                    <div className="text-sm font-bold mb-1">{plan.focus}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                  </div>
                ))}

              </div>

              <div className="flex items-center justify-between bg-[#111a2e] rounded-lg p-3 border border-[#1e2e4a]">
                <span className="text-sm">📚 حفظت الكلمات واستمعت للمقاطع التعليمية</span>
                <Checkbox
                  checked={today.englishDone}
                  onCheckedChange={(c) => store.markEnglish(!!c)}
                  className="border-[#00d2ff] data-[state=checked]:bg-[#39ff14] data-[state=checked]:border-[#39ff14]"
                />
              </div>
            </div>
          </TabsContent>

          {/* Weight Tab */}
          <TabsContent value="weight" className="animate-fade-in">
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">⚖️ رصد وتعديل الميزان والمقاسات</h3>
              <div className="space-y-3 mb-4">
                <Input placeholder="الوزن (كجم)" id="weight-input" type="number" className="bg-[#060913] border-[#1e2e4a] text-white" />
                <Input placeholder="المقاس (وسط)" id="measure-input" type="number" className="bg-[#060913] border-[#1e2e4a] text-white" />
                <Input placeholder="ملاحظات" id="notes-input" className="bg-[#060913] border-[#1e2e4a] text-white" />
                <Button
                  onClick={() => {
                    const w = parseFloat((document.getElementById("weight-input") as HTMLInputElement)?.value || "0");
                    const m = parseFloat((document.getElementById("measure-input") as HTMLInputElement)?.value || "0");
                    const n = (document.getElementById("notes-input") as HTMLInputElement)?.value || "";
                    if (w > 0) {
                      store.addWeight(w, m, n);
                      toast.success("تم حفظ القياس بنجاح!");
                      (document.getElementById("weight-input") as HTMLInputElement).value = "";
                      (document.getElementById("measure-input") as HTMLInputElement).value = "";
                      (document.getElementById("notes-input") as HTMLInputElement).value = "";
                    }
                  }}
                  className="w-full bg-[#ffb703] text-black hover:bg-[#ffb703]/80 font-bold"
                >
                  <Save className="w-4 h-4 ml-1" /> حفظ القياس
                </Button>
              </div>

              {store.weightHistory.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-[#16223f]">
                        <th className="border border-[#1e2e4a] p-2 text-[#ffb703]">اليوم</th>
                        <th className="border border-[#1e2e4a] p-2 text-[#ffb703]">الوزن</th>
                        <th className="border border-[#1e2e4a] p-2 text-[#ffb703]">المقاس</th>
                        <th className="border border-[#1e2e4a] p-2 text-[#ffb703]">ملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.weightHistory.map((r, i) => (
                        <tr key={i}>
                          <td className="border border-[#1e2e4a] p-2">{r.day}</td>
                          <td className="border border-[#1e2e4a] p-2">{r.weight}</td>
                          <td className="border border-[#1e2e4a] p-2">{r.measurement || "—"}</td>
                          <td className="border border-[#1e2e4a] p-2 text-muted-foreground">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Cloud Backup */}
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#00d2ff] font-bold text-sm mb-3 flex items-center gap-2">
                <Cloud className="w-4 h-4" /> ☁️ نظام الحفظ الاحتياطي
              </h3>
              <div className="flex gap-2 mb-3">
                <Button onClick={() => { const code = store.exportData(); navigator.clipboard.writeText(code); toast.success("تم نسخ كود النسخة الاحتياطية!"); }} className="flex-1 bg-[#00d2ff] text-black hover:bg-[#00d2ff]/80 text-xs font-bold">
                  <Download className="w-4 h-4 ml-1" /> استخراج كود
                </Button>
                <Button onClick={() => { const ok = store.importData(importCode); toast[ok ? "success" : "error"](ok ? "تم استيراد البيانات بنجاح!" : "كود غير صالح!"); }} className="flex-1 bg-[#ffb703] text-black hover:bg-[#ffb703]/80 text-xs font-bold">
                  <Upload className="w-4 h-4 ml-1" /> رفع كود
                </Button>
              </div>
              <Input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                placeholder="الصق كود النسخة الاحتياطية هنا..."
                className="bg-[#060913] border-[#1e2e4a] text-white text-xs"
              />
            </div>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai" className="animate-fade-in">
            <div
              className="rounded-2xl border-2 border-[#00d2ff] p-4 mb-4"
              style={{
                background: "linear-gradient(135deg, #091a3a, #050d1e)",
                boxShadow: "0 0 24px rgba(0,210,255,0.35), inset 0 0 24px rgba(0,210,255,0.05)",
              }}
            >
              {/* Hero header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#00d2ff]/15 border border-[#00d2ff] flex items-center justify-center animate-pulse">
                    <Sparkles className="w-5 h-5 text-[#00d2ff]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#00d2ff]">🤖 المساعد الخارق — النظام AI</div>
                    <div className="text-[10px] text-muted-foreground">
                      {aiLoading ? (
                        <span className="text-[#ffd700]">يكتب الآن...</span>
                      ) : (
                        <span>متصل • جاهز للرد فوراً</span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { if (store.chatHistory.length && confirm("مسح كل المحادثة؟")) store.clearChatHistory(); }}
                  className="border-[#1e2e4a] text-muted-foreground hover:text-white hover:border-[#ef4444] h-7 text-[10px]"
                  title="مسح المحادثة"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Chat panel */}
              <div className="bg-[#040812] border border-[#1e2e4a] rounded-xl h-80 overflow-y-auto p-3 mb-3 flex flex-col gap-2">
                {store.chatHistory.length === 0 && !aiLoading && (
                  <div className="text-center py-8 m-auto">
                    <div className="text-[#00d2ff] text-base mb-2 font-bold">مرحباً 👋 أنا "النظام"</div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      اسألني أي شي: كود، تغذية، تمارين، نصائح حياة، أو اطلب صورة 🎨
                    </p>
                  </div>
                )}

                {store.chatHistory.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      className={`group flex items-start gap-1 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {isUser && (
                        <button
                          onClick={() => store.deleteChatMessage(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[#ef4444]/20 text-[#ef4444] self-center shrink-0"
                          title="حذف الرسالة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        className={`max-w-[82%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl ${
                          isUser
                            ? "bg-gradient-to-br from-[#00d2ff] to-[#0099cc] text-black font-medium rounded-br-sm"
                            : "bg-[#0c1a2e] border border-[#1e2e4a] text-white rounded-bl-sm"
                        }`}
                        style={
                          isUser
                            ? { boxShadow: "0 0 12px rgba(0,210,255,0.4)" }
                            : { boxShadow: "0 0 10px rgba(255,215,0,0.08)" }
                        }
                      >
                        {!isUser && (
                          <div className="text-[10px] text-[#ffd700] mb-1 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> النظام
                          </div>
                        )}
                        {msg.text && <div>{msg.text}</div>}
                        {msg.image && (
                          <img
                            src={msg.image}
                            alt="generated"
                            className="mt-2 rounded-lg w-full max-w-xs border border-[#00d2ff]/40"
                            style={{ boxShadow: "0 0 12px rgba(0,210,255,0.3)" }}
                          />
                        )}
                      </div>
                      {!isUser && (
                        <button
                          onClick={() => store.deleteChatMessage(i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[#ef4444]/20 text-[#ef4444] self-center shrink-0"
                          title="حذف الرسالة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator: 3 animated dots */}
                {aiLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div
                      className="bg-[#0c1a2e] border border-[#1e2e4a] rounded-2xl rounded-bl-sm px-4 py-3"
                      style={{ boxShadow: "0 0 10px rgba(0,210,255,0.15)" }}
                    >
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick reply chips — click to send instantly */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {[
                  "خطة دراسة يومية 📚",
                  "تمرين 10 دقائق 💪",
                  "اقترح وجبة صحية 🥗",
                  "نصيحة تحفيز سريعة 🔥",
                  "اشرح useEffect في React",
                  "دعاء قبل النوم 🤲",
                ].map((s) => (
                  <button
                    key={s}
                    disabled={aiLoading}
                    onClick={() => handleQuickReply(s)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-[#1e2e4a] bg-[#0c1a2e] text-[#a0aec0] hover:border-[#ffd700] hover:text-[#ffd700] hover:shadow-[0_0_10px_rgba(255,215,0,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <div className="flex gap-2 items-center bg-[#040812] border border-[#00d2ff]/60 rounded-xl p-1.5 focus-within:border-[#ffd700] focus-within:shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
                  placeholder="اكتب رسالتك أو وصف صورة..."
                  disabled={aiLoading}
                  className="bg-transparent border-0 text-white flex-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  onClick={handleGenerateImage}
                  disabled={aiLoading}
                  title="توليد صورة"
                  size="icon"
                  className="bg-[#8a2be2] hover:bg-[#8a2be2]/80 text-white shrink-0 hover:shadow-[0_0_12px_rgba(138,43,226,0.6)]"
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSendChat}
                  disabled={aiLoading || !chatInput.trim()}
                  title="إرسال"
                  size="icon"
                  className="bg-[#00d2ff] text-black hover:bg-[#00d2ff]/80 font-bold shrink-0 hover:shadow-[0_0_12px_rgba(0,210,255,0.7)]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground text-center">
                💡 اضغط على أي اقتراح يرسل تلقائياً • Enter للإرسال • 🟣 لتوليد صورة
              </div>
            </div>
          </TabsContent>


          {/* AI Controller Tab — نسخة من Lovable تتحكم بالموقع كامل */}
          <TabsContent value="ai-control" className="animate-fade-in">
            <div className="rounded-xl border-2 border-[#39ff14] p-4 mb-4" style={{ background: "linear-gradient(135deg, #0a1a0a, #050d1e)", boxShadow: "0 0 20px rgba(57,255,20,0.2)" }}>
              <h3 className="text-[#39ff14] font-bold text-sm mb-1 text-center flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> ⚡ الـ AI المتحكم بالموقع كامل
              </h3>
              <p className="text-[11px] text-muted-foreground text-center mb-2">
                نسخة منّي داخل موقعك. اطلب أي شي وأنفذه فوراً: "صليت الفجر"، "ودّيني للتمارين"، "وزني 82"، "استبدل كوفي"، "اليوم التالي"... أو اطلب كود/ميزة/خلفية متحركة.
              </p>
              <div className="flex justify-center mb-3">
                <button
                  onClick={() => setMaxMode((v) => !v)}
                  className={`text-[11px] px-3 py-1 rounded-full font-bold transition ${
                    maxMode
                      ? "bg-[#39ff14] text-black shadow-[0_0_12px_rgba(57,255,20,0.6)]"
                      : "bg-[#1e2e4a] text-muted-foreground"
                  }`}
                >
                  {maxMode ? "🚀 MAX MODE — كل الميزات" : "وضع عادي"}
                </button>
              </div>
              <div className="bg-[#040812] border border-[#1e2e4a] rounded-lg h-64 overflow-y-auto p-3 mb-3 text-xs">
                {controlHistory.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    قل لي تبي أعدّل شي أو تبيني أسجّل لك مهمة 💪
                  </p>
                )}
                {controlHistory.map((msg, i) => (
                  <div key={i} className={`mb-2 p-2 rounded-md max-w-[90%] text-sm leading-relaxed ${
                    msg.role === "user" ? "bg-[#1e2e4a] text-white mr-auto" : "bg-[#0c2b1a] border-r-2 border-r-[#39ff14]"
                  }`}>
                    <div>{msg.text}</div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {msg.actions.map((a, j) => (
                          <span key={j} className="text-[10px] bg-[#39ff14]/15 text-[#39ff14] px-1.5 py-0.5 rounded">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {controlLoading && (
                  <div className="bg-[#0c2b1a] border-r-2 border-r-[#39ff14] p-2 rounded-md text-sm">
                    <span className="animate-pulse">جاري التنفيذ...</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={controlInput}
                  onChange={(e) => setControlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleControlSend(); }}
                  placeholder="مثال: صليت الفجر والظهر، وأضف مهمة قراءة 20 دقيقة"
                  className="bg-[#040812] border-[#39ff14] text-white flex-1"
                />
                <Button onClick={handleControlSend} disabled={controlLoading} className="bg-[#39ff14] text-black hover:bg-[#39ff14]/80 font-bold">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-3 text-[10px] text-muted-foreground leading-relaxed">
                💡 يقدر يفتح التبويبات، يسجّل صلوات/مهام/وزن، يضيف مهام مخصصة، يستبدل المكافآت، يشغّل/يوقف المؤقت، ويتنقل بين الأيام.
              </div>
            </div>
          </TabsContent>

          {/* Savings Challenge Tab */}
          <TabsContent value="savings" className="animate-fade-in">
            <SavingsChallenge />
          </TabsContent>

          {/* RPG System Tab */}
          <TabsContent value="rpg" className="animate-fade-in">
            <RPGSystem />
          </TabsContent>

          <TabsContent value="pomodoro" className="animate-fade-in">
            <PomodoroTimer onComplete={(xp) => store.addBonusXP(xp)} />
          </TabsContent>

          <TabsContent value="typing" className="animate-fade-in">
            <TypingTest onReward={(xp) => store.addBonusXP(xp)} />
          </TabsContent>

          <TabsContent value="weight-goal" className="animate-fade-in">
            <WeightGoalCard
              currentWeight={store.currentWeight}
              history={store.weightHistory}
              day={store.day}
              onAddWeight={store.addWeight}
            />
          </TabsContent>

          <TabsContent value="report" className="animate-fade-in">
            <WeeklyReport />
          </TabsContent>

          <TabsContent value="vault" className="animate-fade-in">
            <CodeVault />
          </TabsContent>


          {/* Rewards Tab */}
          <TabsContent value="settings" className="animate-fade-in">
            <div className="card-bg rounded-xl p-4 mb-4">
              <h3 className="text-[#ffb703] font-bold text-sm mb-3">🛒 متجر مكافآت الالتزام</h3>
              <div className="text-xs text-muted-foreground mb-3">استبدل نقاط XP بالترفيه! رصيدك الحالي: <span className="text-[#ffb703] font-bold">{store.totalXP} XP</span></div>
              <div className="grid grid-cols-2 gap-3">
                {rewards.map((r) => {
                  const claimed = store.rewardsClaimed.includes(r.id);
                  const canAfford = store.totalXP >= r.cost;
                  return (
                    <div key={r.id} className={`rounded-lg p-3 border flex flex-col ${claimed ? "border-[#39ff14] bg-[rgba(57,255,20,0.05)]" : canAfford ? "border-[#ffb703] bg-[#1a1607]" : "border-[#1e2e4a] bg-[#111a2e] opacity-70"}`}>
                      <div className="text-3xl mb-1 text-center">{r.name.split(" ")[0]}</div>
                      <div className="text-xs font-bold mb-1 text-center">{r.name.split(" ").slice(1).join(" ")}</div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 text-center flex-1">{r.description}</p>
                      <div className="text-[#ffb703] text-xs font-bold mb-2 text-center">{r.cost} XP</div>
                      <Button
                        onClick={() => {
                          if (!claimed) {
                            const ok = store.claimReward(r.id, r.cost);
                            toast[ok ? "success" : "error"](ok ? "تم الاستبدال بنجاح! استمتع 🎉" : "رصيد XP غير كافٍ! استمر في التقدم 💪");
                          }
                        }}
                        disabled={claimed}
                        size="sm"
                        className={`text-xs w-full ${claimed ? "bg-[#39ff14]/20 text-[#39ff14]" : "bg-[#ffb703] text-black hover:bg-[#ffb703]/80"}`}
                      >
                        {claimed ? <Check className="w-3 h-3 ml-1" /> : <Award className="w-3 h-3 ml-1" />}
                        {claimed ? "تم الاستبدال" : "استبدال"}
                      </Button>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-[#ef4444] p-4 mb-4" style={{ background: "rgba(239, 68, 68, 0.08)" }}>
              <h3 className="text-[#ef4444] font-bold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> 🛑 رادار كشف التخبيص والممنوعات
              </h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {dangerItems.map((item, i) => (
                  <span key={i} className="bg-[#1a1111] border border-[#ef4444] px-3 py-1 rounded-full text-xs text-[#ef4444]">
                    {item}
                  </span>
                ))}
              </div>
              <Button
                onClick={() => {
                  store.reportViolation();
                  toast.error("⚠️ تم تسجيل المخالفة! -30 XP وتصفير الستريك!");
                }}
                className="w-full bg-[#ef4444] hover:bg-[#ef4444]/80 text-white font-bold"
              >
                ⚠️ بلّغ عن مخالفة (-30 XP وتصفير الـ Streak فوراً)
              </Button>
            </div>

            {/* Violations History */}
            {Object.values(store.dayData).some((d) => d.violations > 0) && (
              <div className="card-bg rounded-xl p-4">
                <h3 className="text-[#ef4444] font-bold text-sm mb-3">📋 سجل المخالفات</h3>
                <div className="space-y-1">
                  {Object.entries(store.dayData)
                    .filter(([, d]) => d.violations > 0)
                    .map(([dayNum, d]) => (
                      <div key={dayNum} className="flex justify-between text-xs bg-[#1a1111] rounded p-2 border border-[#ef4444]/30">
                        <span>اليوم {dayNum}</span>
                        <span className="text-[#ef4444]">{d.violations} مخالفة</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}



/* ===== src/components/ParticlesBackground.tsx ===== */
"use client";

import { useEffect, useRef } from "react";

/**
 * Subtle particle field rendered on a fixed canvas behind all content.
 * Cheap, GPU-friendly, respects prefers-reduced-motion.
 */
export default function ParticlesBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    const count = Math.min(70, Math.floor((w * h) / 22000));
    const COLORS = ["#ffb703", "#00d2ff", "#39ff14", "#8a2be2"];
    const particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      a: Math.random() * 0.4 + 0.15,
    }));

    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    window.addEventListener("resize", onResize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = p.c;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.55 }}
    />
  );
}



/* ===== src/components/PasswordGate.tsx ===== */
"use client";
import { useEffect, useState } from "react";
import { APP_PASSWORD, AUTH_STORAGE_KEY } from "@/lib/auth-config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false);
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(AUTH_STORAGE_KEY) === APP_PASSWORD) setOk(true);
    } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (ok) return <>{children}</>;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const entered = pw.trim();
    if (entered === APP_PASSWORD.trim()) {
      try { localStorage.setItem(AUTH_STORAGE_KEY, APP_PASSWORD); } catch {}
      setOk(true);
    } else {
      setErr("كلمة المرور غير صحيحة");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border-2 border-[#ffb703] p-6 text-center"
        style={{ background: "linear-gradient(145deg, #070c18, #0f1a34)", boxShadow: "0 0 30px rgba(255,183,3,0.25)" }}
      >
        <div className="mx-auto w-14 h-14 rounded-full bg-[#ffb703]/15 border border-[#ffb703] flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-[#ffb703]" />
        </div>
        <h1 className="text-xl font-bold text-[#ffb703] mb-1">👑 الدخول الخاص</h1>
        <p className="text-xs text-muted-foreground mb-4">أدخل كلمة المرور للوصول إلى نظام تطوير الذات</p>
        <Input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => { setPw(e.target.value); setErr(""); }}
          placeholder="كلمة المرور"
          className="bg-[#040812] border-[#1e2e4a] text-white text-center mb-3"
        />
        {err && <div className="text-[#ef4444] text-xs mb-2">{err}</div>}
        <Button type="submit" className="w-full bg-[#ffb703] text-black hover:bg-[#ffb703]/80 font-bold">
          دخول
        </Button>
      </form>
    </div>
  );
}



/* ===== src/components/PomodoroTimer.tsx ===== */
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Timer, Coffee, Zap } from "lucide-react";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface Props {
  onComplete: (xp: number) => void;
}

const FOCUS = 25 * 60;
const BREAK = 5 * 60;

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

export default function PomodoroTimer({ onComplete }: Props) {
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [seconds, setSeconds] = useState(FOCUS);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const sfx = useSoundEffects(true);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  useEffect(() => {
    if (seconds === 0 && running) {
      setRunning(false);
      sfx.success();
      if (mode === "focus") {
        setSessions((n) => n + 1);
        onComplete(10);
        toast.success("🍅 جلسة تركيز كاملة! +10 XP — وقت الاستراحة 5 دقائق");
        setMode("break");
        setSeconds(BREAK);
      } else {
        toast.success("☕ خلصت الاستراحة — يلا نرجع نركّز!");
        setMode("focus");
        setSeconds(FOCUS);
      }
    }
  }, [seconds, running, mode, onComplete, sfx]);

  const total = mode === "focus" ? FOCUS : BREAK;
  const pct = ((total - seconds) / total) * 100;

  return (
    <div
      className="card-bg rounded-xl p-5 neon-breathe"
      style={{ background: "linear-gradient(145deg, #0d1527, #16122c)", borderColor: mode === "focus" ? "var(--gold)" : "var(--accent)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        {mode === "focus" ? <Timer className="w-5 h-5" style={{ color: "var(--gold)" }} /> : <Coffee className="w-5 h-5" style={{ color: "var(--accent)" }} />}
        <h3 className="font-bold neon-heading" style={{ color: mode === "focus" ? "var(--gold)" : "var(--accent)" }}>
          🍅 بومودورو — {mode === "focus" ? "تركيز" : "استراحة"}
        </h3>
      </div>

      <div className="text-center mb-4">
        <div className="text-6xl font-mono font-bold neon-text-gold neon-heading mb-2">{fmt(seconds)}</div>
        <div className="xp-bar-bg rounded-full h-2.5 overflow-hidden">
          <div className="xp-bar-fill h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          الجلسات المكتملة اليوم: <span className="text-[#39ff14] font-bold">{sessions}</span>
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        <Button onClick={() => setRunning((r) => !r)} className="gold-gradient text-black font-bold">
          {running ? <><Pause className="w-4 h-4" /> إيقاف</> : <><Play className="w-4 h-4" /> ابدأ</>}
        </Button>
        <Button
          variant="outline"
          onClick={() => { setRunning(false); setSeconds(mode === "focus" ? FOCUS : BREAK); }}
          className="border-[#00d2ff] text-[#00d2ff] hover:bg-[#00d2ff]/10"
        >
          <RotateCcw className="w-4 h-4" /> صفر
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setRunning(false);
            const nm = mode === "focus" ? "break" : "focus";
            setMode(nm);
            setSeconds(nm === "focus" ? FOCUS : BREAK);
          }}
          className="border-[#8a2be2] text-[#c084fc] hover:bg-[#8a2be2]/10"
        >
          <Zap className="w-4 h-4" /> تبديل
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">
        25 دقيقة تركيز · 5 دقائق راحة · +10 XP لكل جلسة كاملة
      </p>
    </div>
  );
}



/* ===== src/components/RPGSystem.tsx ===== */
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Lock,
  Unlock,
  Target,
  BookLock,
  Gift,
  Star,
  Coins,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

/* ============================================================
   RPG SYSTEM — self-contained, frontend-only, localStorage state
   Contains: Pomodoro, Lucky Spin, Side Quests, Wishlist,
             Cyber Journal, Inventory / Loot
   ============================================================ */

const RPG_KEY = "rpg-system-v1";

interface RpgState {
  coins: number;
  xpBonus: number;
  inventory: { id: string; name: string; emoji: string; date: string }[];
  spinDate: string; // YYYY-MM-DD of last spin
  questsDate: string;
  questsDone: Record<string, boolean>;
  wishlist: { id: string; name: string; cost: number }[];
  journal: string; // simple encoded string
  journalLocked: boolean;
}

const defaultRpg = (): RpgState => ({
  coins: 0,
  xpBonus: 0,
  inventory: [],
  spinDate: "",
  questsDate: "",
  questsDone: {},
  wishlist: [],
  journal: "",
  journalLocked: true,
});

function loadRpg(): RpgState {
  try {
    const raw = localStorage.getItem(RPG_KEY);
    if (raw) return { ...defaultRpg(), ...JSON.parse(raw) };
  } catch {}
  return defaultRpg();
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const LOOT_POOL = [
  { emoji: "⚔️", name: "سيف نيوني" },
  { emoji: "🛡️", name: "درع مظلم" },
  { emoji: "🗝️", name: "مفتاح أسطوري" },
  { emoji: "💎", name: "جوهرة سايبر" },
  { emoji: "🔮", name: "كرة نيون" },
  { emoji: "🎴", name: "بطاقة لوفي" },
  { emoji: "🏅", name: "ميدالية انضباط" },
  { emoji: "🪙", name: "عملة ذهبية" },
];

const SPIN_PRIZES = [
  { label: "+50 XP", type: "xp", value: 50 },
  { label: "+25 عملة", type: "coins", value: 25 },
  { label: "+100 XP", type: "xp", value: 100 },
  { label: "صندوق غنائم", type: "loot", value: 1 },
  { label: "+10 عملات", type: "coins", value: 10 },
  { label: "+30 XP", type: "xp", value: 30 },
] as const;

const QUEST_POOL = [
  { id: "q1", text: "اشرب كوب ماء الآن", reward: 5 },
  { id: "q2", text: "10 تمرين ضغط فوراً", reward: 10 },
  { id: "q3", text: "تعلّم 3 كلمات إنجليزية", reward: 8 },
  { id: "q4", text: "تأمل 60 ثانية", reward: 5 },
  { id: "q5", text: "اقرأ صفحة من كتاب", reward: 7 },
  { id: "q6", text: "مشي خفيف 5 دقائق", reward: 6 },
  { id: "q7", text: "نظّم مكتبك", reward: 5 },
  { id: "q8", text: "وفّر 10 ريال", reward: 8 },
];

function pickDailyQuests(seed: string, count = 3) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const arr = [...QUEST_POOL];
  const out: typeof QUEST_POOL = [] as any;
  for (let i = 0; i < count && arr.length; i++) {
    h = (h * 9301 + 49297) % 233280;
    const idx = h % arr.length;
    out.push(arr.splice(idx, 1)[0]);
  }
  return out;
}

const JOURNAL_PASSWORD = "weilx777"; // gate password

export default function RPGSystem() {
  const [s, setS] = useState<RpgState>(() => defaultRpg());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setS(loadRpg());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated) localStorage.setItem(RPG_KEY, JSON.stringify(s));
  }, [s, hydrated]);

  const patch = (p: Partial<RpgState>) => setS((prev) => ({ ...prev, ...p }));

  const grant = (type: "xp" | "coins" | "loot", value: number) => {
    if (type === "xp") {
      patch({ xpBonus: s.xpBonus + value });
      toast.success(`+${value} XP إضافية ⚡`);
    } else if (type === "coins") {
      patch({ coins: s.coins + value });
      toast.success(`+${value} عملة 🪙`);
    } else {
      const loot = LOOT_POOL[Math.floor(Math.random() * LOOT_POOL.length)];
      const item = {
        id: `${Date.now()}`,
        name: loot.name,
        emoji: loot.emoji,
        date: todayKey(),
      };
      patch({ inventory: [item, ...s.inventory] });
      toast.success(`صندوق غنائم: ${loot.emoji} ${loot.name}`);
    }
  };

  /* ---------------- Pomodoro ---------------- */
  const [pomoMode, setPomoMode] = useState<"work" | "break">("work");
  const [pomoLeft, setPomoLeft] = useState(25 * 60);
  const [pomoRun, setPomoRun] = useState(false);
  const pomoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pomoRun) {
      pomoRef.current = setInterval(() => {
        setPomoLeft((x) => {
          if (x <= 1) {
            setPomoRun(false);
            if (pomoMode === "work") {
              grant("xp", 10);
              setPomoMode("break");
              return 5 * 60;
            } else {
              toast("انتهت الراحة، عُد للعمل 💪");
              setPomoMode("work");
              return 25 * 60;
            }
          }
          return x - 1;
        });
      }, 1000);
    }
    return () => {
      if (pomoRef.current) clearInterval(pomoRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoRun, pomoMode]);

  const pomoTotal = pomoMode === "work" ? 25 * 60 : 5 * 60;
  const pomoPct = ((pomoTotal - pomoLeft) / pomoTotal) * 100;
  const mm = Math.floor(pomoLeft / 60).toString().padStart(2, "0");
  const ss = (pomoLeft % 60).toString().padStart(2, "0");

  /* ---------------- Daily Side Quests ---------------- */
  const quests = useMemo(() => pickDailyQuests(todayKey()), []);
  useEffect(() => {
    if (s.questsDate !== todayKey()) {
      patch({ questsDate: todayKey(), questsDone: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  /* ---------------- Wishlist ---------------- */
  const [wishName, setWishName] = useState("");
  const [wishCost, setWishCost] = useState("");
  const addWish = () => {
    const c = parseInt(wishCost, 10);
    if (!wishName.trim() || !c || c <= 0) return;
    patch({
      wishlist: [
        ...s.wishlist,
        { id: `${Date.now()}`, name: wishName.trim(), cost: c },
      ],
    });
    setWishName("");
    setWishCost("");
  };

  /* ---------------- Journal ---------------- */
  const [journalPwd, setJournalPwd] = useState("");
  const [journalDraft, setJournalDraft] = useState("");
  useEffect(() => {
    if (!s.journalLocked) {
      try {
        setJournalDraft(s.journal ? atob(s.journal) : "");
      } catch {
        setJournalDraft("");
      }
    }
  }, [s.journalLocked, s.journal]);

  /* ---------------- Spin Wheel ---------------- */
  const [spinning, setSpinning] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);
  const canSpin = s.spinDate !== todayKey();
  const doSpin = () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    const prizeIdx = Math.floor(Math.random() * SPIN_PRIZES.length);
    const segment = 360 / SPIN_PRIZES.length;
    const finalAngle = 360 * 6 + (360 - prizeIdx * segment - segment / 2);
    setSpinAngle(finalAngle);
    setTimeout(() => {
      const prize = SPIN_PRIZES[prizeIdx];
      grant(prize.type as any, prize.value);
      patch({ spinDate: todayKey() });
      setSpinning(false);
    }, 3200);
  };

  if (!hydrated) return null;

  return (
    <div className="animate-fade-in space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-bg rounded-xl p-3 border border-[#ffb703]/40 flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#ffb703]" />
          <div>
            <div className="text-[10px] text-muted-foreground">العملات</div>
            <div className="text-[#ffb703] font-bold text-lg">{s.coins}</div>
          </div>
        </div>
        <div className="card-bg rounded-xl p-3 border border-[#00e5ff]/40 flex items-center gap-2">
          <Star className="w-5 h-5 text-[#00e5ff]" />
          <div>
            <div className="text-[10px] text-muted-foreground">XP إضافية</div>
            <div className="text-[#00e5ff] font-bold text-lg">{s.xpBonus}</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pomo" className="w-full">
        <TabsList className="w-full grid grid-cols-3 bg-[#0c1426] mb-3">
          <TabsTrigger value="pomo" className="text-xs">
            <Timer className="w-3 h-3 ml-1" /> تركيز
          </TabsTrigger>
          <TabsTrigger value="spin" className="text-xs">
            <Sparkles className="w-3 h-3 ml-1" /> العجلة
          </TabsTrigger>
          <TabsTrigger value="quests" className="text-xs">
            <Target className="w-3 h-3 ml-1" /> مهام
          </TabsTrigger>
        </TabsList>

        {/* Pomodoro */}
        <TabsContent value="pomo">
          <div className="card-bg rounded-xl p-4 flex flex-col items-center">
            <div className="relative w-44 h-44 mb-3">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#1e2e4a"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke={pomoMode === "work" ? "#00e5ff" : "#39ff14"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(pomoPct / 100) * 276.46} 276.46`}
                  style={{
                    filter: `drop-shadow(0 0 6px ${
                      pomoMode === "work" ? "#00e5ff" : "#39ff14"
                    })`,
                    transition: "stroke-dasharray 1s linear",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[10px] text-muted-foreground">
                  {pomoMode === "work" ? "وقت العمل" : "راحة"}
                </div>
                <div className="text-3xl font-bold text-foreground tabular-nums">
                  {mm}:{ss}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPomoRun((r) => !r)}
                className="bg-[#00e5ff] text-black hover:bg-[#00e5ff]/80"
              >
                {pomoRun ? (
                  <>
                    <Pause className="w-4 h-4 ml-1" /> إيقاف
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 ml-1" /> ابدأ
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setPomoRun(false);
                  setPomoMode("work");
                  setPomoLeft(25 * 60);
                }}
                variant="outline"
                className="border-[#1e2e4a]"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              25 دقيقة عمل → 5 دقائق راحة. اكسب +10 XP بعد كل جلسة.
            </div>
          </div>
        </TabsContent>

        {/* Spin */}
        <TabsContent value="spin">
          <div className="card-bg rounded-xl p-4 flex flex-col items-center">
            <div className="relative w-56 h-56 mb-3">
              {/* Pointer */}
              <div
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 z-10"
                style={{
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "16px solid #ffb703",
                  filter: "drop-shadow(0 0 6px #ffb703)",
                }}
              />
              <div
                className="w-full h-full rounded-full border-4 border-[#ffb703] relative overflow-hidden"
                style={{
                  transform: `rotate(${spinAngle}deg)`,
                  transition: spinning
                    ? "transform 3s cubic-bezier(0.17,0.67,0.21,1)"
                    : undefined,
                  boxShadow: "0 0 24px rgba(255,183,3,0.5)",
                }}
              >
                {SPIN_PRIZES.map((p, i) => {
                  const seg = 360 / SPIN_PRIZES.length;
                  const rot = i * seg;
                  const bg = i % 2 ? "#0c1426" : "#1a1607";
                  return (
                    <div
                      key={i}
                      className="absolute top-0 left-1/2 w-1/2 h-1/2 origin-bottom-left text-[10px] font-bold text-[#ffb703]"
                      style={{
                        transform: `rotate(${rot}deg) skewY(${seg - 90}deg)`,
                        background: bg,
                      }}
                    >
                      <span
                        className="absolute top-2 right-3"
                        style={{
                          transform: `skewY(${90 - seg}deg) rotate(${
                            seg / 2
                          }deg)`,
                        }}
                      >
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <Button
              onClick={doSpin}
              disabled={!canSpin || spinning}
              className="bg-[#ffb703] text-black hover:bg-[#ffb703]/80 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 ml-1" />
              {canSpin ? "أدر العجلة" : "تم استخدامها اليوم — عُد غداً"}
            </Button>
          </div>
        </TabsContent>

        {/* Side Quests */}
        <TabsContent value="quests">
          <div className="card-bg rounded-xl p-4">
            <div className="text-xs text-muted-foreground mb-2">
              مهام جانبية عشوائية تتغير كل يوم. أنجزها واحصل على عملات فورية.
            </div>
            <div className="space-y-2">
              {quests.map((q) => {
                const done = !!s.questsDone[q.id];
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (done) return;
                      patch({
                        questsDone: { ...s.questsDone, [q.id]: true },
                        coins: s.coins + q.reward,
                      });
                      toast.success(`✅ +${q.reward} عملات`);
                    }}
                    disabled={done}
                    className={`w-full text-right p-3 rounded-lg border transition ${
                      done
                        ? "bg-[#39ff14]/10 border-[#39ff14] text-[#39ff14] line-through"
                        : "bg-[#0c1426] border-[#1e2e4a] hover:border-[#ffb703]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{q.text}</span>
                      <span className="text-[#ffb703] text-xs font-bold">
                        +{q.reward} 🪙
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Inventory */}
      <div className="card-bg rounded-xl p-4">
        <h3 className="text-[#00e5ff] font-bold text-sm mb-2 flex items-center gap-2">
          <Gift className="w-4 h-4" /> المستودع
        </h3>
        {s.inventory.length === 0 ? (
          <div className="text-xs text-muted-foreground">
            فارغ — اربح صناديق غنائم من عجلة الحظ.
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {s.inventory.map((it) => (
              <div
                key={it.id}
                className="aspect-square rounded-lg border border-[#00e5ff]/40 bg-[#0c1426] flex flex-col items-center justify-center text-center p-1"
                title={`${it.name} — ${it.date}`}
                style={{ boxShadow: "0 0 8px rgba(0,229,255,0.25)" }}
              >
                <div className="text-2xl">{it.emoji}</div>
                <div className="text-[9px] text-muted-foreground truncate w-full">
                  {it.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wishlist */}
      <div className="card-bg rounded-xl p-4">
        <h3 className="text-[#ffb703] font-bold text-sm mb-2 flex items-center gap-2">
          <Star className="w-4 h-4" /> قائمة الأمنيات
        </h3>
        <div className="flex gap-2 mb-3">
          <Input
            value={wishName}
            onChange={(e) => setWishName(e.target.value)}
            placeholder="اسم الأمنية"
            className="bg-[#0c1426] border-[#1e2e4a] text-xs"
          />
          <Input
            value={wishCost}
            onChange={(e) => setWishCost(e.target.value)}
            placeholder="سعر بالعملات"
            type="number"
            className="bg-[#0c1426] border-[#1e2e4a] text-xs w-32"
          />
          <Button onClick={addWish} size="sm" className="bg-[#ffb703] text-black">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2">
          {s.wishlist.map((w) => {
            const pct = Math.min(100, (s.coins / w.cost) * 100);
            const unlocked = s.coins >= w.cost;
            return (
              <div
                key={w.id}
                className={`rounded-lg p-2 border ${
                  unlocked
                    ? "border-[#39ff14] bg-[#39ff14]/5"
                    : "border-[#1e2e4a] bg-[#0c1426]"
                }`}
              >
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-bold">{w.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-[#ffb703]">{w.cost} 🪙</span>
                    <button
                      onClick={() =>
                        patch({
                          wishlist: s.wishlist.filter((x) => x.id !== w.id),
                        })
                      }
                      className="text-[#ef4444]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0a1020] overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: unlocked
                        ? "#39ff14"
                        : "linear-gradient(90deg,#ffb703,#00e5ff)",
                      boxShadow: unlocked
                        ? "0 0 8px #39ff14"
                        : "0 0 8px rgba(0,229,255,0.5)",
                    }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {unlocked
                    ? "🎉 جاهز للفتح!"
                    : `متبقي ${(w.cost - s.coins).toLocaleString()} عملة`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cyber Journal */}
      <div className="card-bg rounded-xl p-4">
        <h3 className="text-[#00e5ff] font-bold text-sm mb-2 flex items-center gap-2">
          <BookLock className="w-4 h-4" /> المفكرة السرية
        </h3>
        {s.journalLocked ? (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground">
              كلمة المرور الافتراضية: <code className="text-[#ffb703]">cyber</code>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={journalPwd}
                onChange={(e) => setJournalPwd(e.target.value)}
                placeholder="كلمة المرور"
                className="bg-[#0c1426] border-[#1e2e4a] text-xs"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (journalPwd === JOURNAL_PASSWORD) {
                    patch({ journalLocked: false });
                    setJournalPwd("");
                  } else {
                    toast.error("كلمة مرور خاطئة");
                  }
                }}
                className="bg-[#00e5ff] text-black"
              >
                <Unlock className="w-4 h-4 ml-1" /> فتح
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={journalDraft}
              onChange={(e) => setJournalDraft(e.target.value)}
              placeholder="أفكارك، أهدافك، أكوادك السرية..."
              className="bg-[#0c1426] border-[#1e2e4a] min-h-32 text-sm"
              style={{ textShadow: "0 0 4px rgba(0,229,255,0.3)" }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  patch({ journal: btoa(journalDraft) });
                  toast.success("تم الحفظ مشفّر 🔐");
                }}
                className="bg-[#ffb703] text-black"
              >
                حفظ
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => patch({ journalLocked: true })}
                className="border-[#1e2e4a]"
              >
                <Lock className="w-4 h-4 ml-1" /> قفل
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



/* ===== src/components/SavingsChallenge.tsx ===== */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw, PiggyBank } from "lucide-react";
import { toast } from "sonner";

// Amounts grid (10 cols x 11 rows) inspired by the wooden savings board
const AMOUNTS: number[] = [
  80, 40, 80, 60, 60, 50, 60, 40, 80, 100, 150,
  20, 40, 50, 50, 10, 60, 60, 30, 70, 150, 100,
  60, 50, 60, 20, 50, 10, 60, 70, 50, 150, 100,
  30, 20, 50, 20, 50, 70, 60, 50, 50, 150, 100,
  80, 30, 50, 20, 10, 80, 60, 70, 50, 150, 100,
  70, 80, 50, 40, 30, 80, 60, 80, 50, 150, 100,
  50, 80, 50, 40, 80, 30, 60, 80, 60, 500, 200,
  60, 50, 60, 40, 80, 30, 90, 50, 50, 200, 100,
  50, 70, 60, 40, 80, 30, 50, 20, 50, 200, 100,
  40, 40, 60, 40, 80, 50, 50, 20, 50, 100, 200,
  70, 30, 70, 60, 80, 30, 80, 30, 50, 100, 100,
  40, 20, 50, 50, 60, 80, 70, 60, 40, 100, 150,
];

const TARGET = 10000;
const STORAGE_KEY = "savings-challenge-v1";

interface Props {
  /** Optional callback fired when a cell is toggled (delta = +amount or -amount). Use to grant XP/coins. */
  onDelta?: (delta: number) => void;
}

export default function SavingsChallenge({ onDelta }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {}
  }, [checked]);

  const total = useMemo(
    () => AMOUNTS.reduce((sum, amt, i) => (checked[i] ? sum + amt : sum), 0),
    [checked],
  );
  const percent = Math.min(100, (total / TARGET) * 100);

  const toggle = (idx: number) => {
    const wasChecked = !!checked[idx];
    setChecked((prev) => ({ ...prev, [idx]: !wasChecked }));
    const delta = wasChecked ? -AMOUNTS[idx] : AMOUNTS[idx];
    onDelta?.(delta);
    if (!wasChecked) {
      toast.success(`💰 +${AMOUNTS[idx]} ريال للحصالة`);
    }
  };

  const reset = () => {
    if (confirm("هل أنت متأكد من تصفير الحصالة؟")) {
      setChecked({});
      toast("تم تصفير الحصالة");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        className="card-bg rounded-xl p-4 mb-4 border border-[#ffb703]/30"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,183,3,0.08), rgba(0,229,255,0.05))",
        }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-[#ffb703] font-bold text-base flex items-center gap-2">
            <PiggyBank className="w-5 h-5" /> تحدي التوفير: حصالة الأمنيات
          </h3>
          <div className="text-xs text-muted-foreground">
            الهدف:{" "}
            <span className="text-[#00e5ff] font-bold">
              {TARGET.toLocaleString()} ريال
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg bg-[#0c1426] border border-[#ffb703]/40 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">المجموع</div>
            <div className="text-[#ffb703] font-bold text-sm">
              {total.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-[#0c1426] border border-[#00e5ff]/40 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">المتبقي</div>
            <div className="text-[#00e5ff] font-bold text-sm">
              {Math.max(0, TARGET - total).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-[#0c1426] border border-[#39ff14]/40 p-2 text-center">
            <div className="text-[10px] text-muted-foreground">النسبة</div>
            <div className="text-[#39ff14] font-bold text-sm">
              {percent.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 rounded-full bg-[#0a1020] border border-[#1e2e4a] overflow-hidden">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${percent}%`,
              background:
                "linear-gradient(90deg, #ffb703, #00e5ff)",
              boxShadow: "0 0 12px rgba(0,229,255,0.6)",
            }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground text-center mt-1">
          {total.toLocaleString()} / {TARGET.toLocaleString()} ريال
        </div>
      </div>

      {/* Grid */}
      <div className="card-bg rounded-xl p-3 mb-4">
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-11 gap-1.5">
          {AMOUNTS.map((amt, i) => {
            const isChecked = !!checked[i];
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`relative aspect-square rounded-md text-[11px] sm:text-xs font-bold transition-all duration-200 border ${
                  isChecked
                    ? "bg-[#00e5ff]/15 border-[#00e5ff] text-[#00e5ff] line-through"
                    : "bg-[#0c1426] border-[#1e2e4a] text-foreground hover:border-[#ffb703] hover:text-[#ffb703]"
                }`}
                style={
                  isChecked
                    ? { boxShadow: "0 0 10px rgba(0,229,255,0.5)" }
                    : undefined
                }
                aria-pressed={isChecked}
              >
                {amt}
                {isChecked && (
                  <Check className="w-3 h-3 absolute top-0.5 right-0.5 text-[#39ff14]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={reset}
        variant="outline"
        size="sm"
        className="w-full border-[#ef4444]/40 text-[#ef4444] hover:bg-[#ef4444]/10"
      >
        <RotateCcw className="w-3 h-3 ml-2" /> تصفير الحصالة
      </Button>
    </div>
  );
}



/* ===== src/components/ThemeSwitcher.tsx ===== */
"use client";

import { useEffect, useState } from "react";
import luffy from "@/assets/themes/luffy.jpg.asset.json";
import naruto from "@/assets/themes/naruto.jpg.asset.json";
import gojo from "@/assets/themes/gojo.jpg.asset.json";
import zoro from "@/assets/themes/zoro.jpg.asset.json";
import sungjinwoo from "@/assets/themes/sungjinwoo.jpg.asset.json";
import girl from "@/assets/themes/girl.jpg.asset.json";
import ace from "@/assets/themes/ace.jpg.asset.json";
import isagi from "@/assets/themes/isagi.jpg.asset.json";

type Theme = {
  id: string;
  name: string;
  emoji: string;
  primary: string;
  accent: string;
  gold: string;
  neonBlue: string;
  bg: string;
  swatch: string;
};

const THEMES: Theme[] = [
  { id: "crimson-red",   name: "لوفي الأحمر",       emoji: "🔴", primary: "#ef4444", accent: "#f97316", gold: "#ef4444", neonBlue: "#f97316", bg: luffy.url,      swatch: "#ef4444" },
  { id: "royal-gold",    name: "ناروتو الذهبي",     emoji: "👑", primary: "#ffb703", accent: "#00d2ff", gold: "#ffb703", neonBlue: "#00d2ff", bg: naruto.url,     swatch: "#ffb703" },
  { id: "cyber-blue",    name: "غوجو الأزرق",       emoji: "⚡", primary: "#00d2ff", accent: "#3b82f6", gold: "#00d2ff", neonBlue: "#3b82f6", bg: gojo.url,       swatch: "#00d2ff" },
  { id: "matrix-green",  name: "زورو الأخضر",       emoji: "🟢", primary: "#39ff14", accent: "#00ff9d", gold: "#39ff14", neonBlue: "#00ff9d", bg: zoro.url,       swatch: "#39ff14" },
  { id: "deep-purple",   name: "سونغ جين البنفسجي", emoji: "🔮", primary: "#a855f7", accent: "#c084fc", gold: "#a855f7", neonBlue: "#c084fc", bg: sungjinwoo.url, swatch: "#a855f7" },
  { id: "neon-pink",     name: "الوردي المضيء",     emoji: "🌸", primary: "#ff37b1", accent: "#ff7ad9", gold: "#ff37b1", neonBlue: "#ff7ad9", bg: girl.url,       swatch: "#ff37b1" },
  { id: "volcano-orange",name: "إيس البرتقالي",     emoji: "🔥", primary: "#ff6a00", accent: "#ffb703", gold: "#ff6a00", neonBlue: "#ffb703", bg: ace.url,        swatch: "#ff6a00" },
  { id: "ice-white",     name: "إيساغي الأزرق الفاتح", emoji: "❄️", primary: "#7dd3fc", accent: "#e2f3ff", gold: "#7dd3fc", neonBlue: "#e2f3ff", bg: isagi.url,    swatch: "#7dd3fc" },
];

const STORAGE_KEY = "wael-theme-v2";

function applyTheme(t: Theme) {
  const r = document.documentElement.style;
  r.setProperty("--primary", t.primary);
  r.setProperty("--accent", t.accent);
  r.setProperty("--gold", t.gold);
  r.setProperty("--neon-blue", t.neonBlue);
  r.setProperty("--ring", t.primary);
  r.setProperty("--theme-bg-image", `url("${t.bg}")`);
  r.setProperty("--theme-glow", t.primary);
}

export default function ThemeSwitcher() {
  const [active, setActive] = useState<string>("crimson-red");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const theme = THEMES.find((t) => t.id === saved) ?? THEMES[0];
    setActive(theme.id);
    applyTheme(theme);
  }, []);

  const pick = (t: Theme) => {
    setActive(t.id);
    applyTheme(t);
    localStorage.setItem(STORAGE_KEY, t.id);
  };

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap mb-3" dir="rtl">
      <span className="text-xs text-muted-foreground">🎨 ثيم:</span>
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => pick(t)}
          title={`${t.name} ${t.emoji}`}
          className={`w-8 h-8 rounded-full border-2 transition-all duration-300 hover:scale-125 ${
            active === t.id ? "border-white scale-110" : "border-transparent"
          }`}
          style={{
            background: t.swatch,
            boxShadow: active === t.id
              ? `0 0 16px ${t.swatch}, 0 0 28px ${t.swatch}`
              : `0 0 8px ${t.swatch}66`,
          }}
        >
          <span className="sr-only">{t.name}</span>
        </button>
      ))}
    </div>
  );
}



/* ===== src/components/TiltCard.tsx ===== */
"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: number;
}

/**
 * 3D tilt wrapper. Tracks mouse over the card and tilts on X/Y axes,
 * plus a subtle spotlight that follows the cursor. CSS-only transforms.
 */
export default function TiltCard({
  intensity = 8,
  className,
  children,
  style,
  ...rest
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * intensity;
    const ry = (x - 0.5) * intensity;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0) rotateY(0) translateZ(0)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={cn("tilt-card transition-transform duration-200 will-change-transform", className)}
      style={{ transformStyle: "preserve-3d", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}



/* ===== src/components/TypingTest.tsx ===== */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Keyboard, RotateCcw, Trophy, Zap } from "lucide-react";
import { toast } from "sonner";
import { useSoundEffects } from "@/hooks/useSoundEffects";

interface Props {
  onReward: (xp: number) => void;
}

const SENTENCES = [
  "Discipline is the bridge between goals and accomplishment.",
  "The quick brown fox jumps over the lazy dog.",
  "const element = document.querySelector('.neon-button');",
  "Practice makes progress, not perfection.",
  "<div className='card-bg rounded-xl p-4'>Hello World</div>",
  "Stay hungry, stay foolish, keep learning every single day.",
  "background: linear-gradient(135deg, #ffb703, #00d2ff);",
  "function levelUp(xp) { return xp + 100; }",
  "Success is the sum of small efforts repeated day in and day out.",
  "@keyframes neon { 0% { opacity: 0.5; } 100% { opacity: 1; } }",
  "Code is like humor. When you have to explain it, it is bad.",
  "import React, { useState, useEffect } from 'react';",
];

const DURATION = 60;

export default function TypingTest({ onReward }: Props) {
  const [sentence, setSentence] = useState(() => SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
  const [typed, setTyped] = useState("");
  const [seconds, setSeconds] = useState(DURATION);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ wpm: number; acc: number; correct: number; total: number } | null>(null);
  const sfx = useSoundEffects(true);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!started || done) return;
    ref.current = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [started, done]);

  const finish = (finalTyped: string, elapsed: number) => {
    if (done) return;
    setDone(true);
    setStarted(false);
    let correct = 0;
    for (let i = 0; i < finalTyped.length; i++) {
      if (finalTyped[i] === sentence[i]) correct++;
    }
    const total = finalTyped.length || 1;
    const acc = Math.round((correct / total) * 100);
    const words = correct / 5;
    const mins = Math.max(elapsed / 60, 1 / 60);
    const wpm = Math.round(words / mins);
    setResult({ wpm, acc, correct, total: finalTyped.length });
    sfx.success();
    if (wpm >= 40) {
      onReward(30);
      toast.success(`🏆 مذهل! ${wpm} WPM — +30 XP!`);
    } else {
      toast(`⚡ ${wpm} WPM — حاول توصل 40+ للحصول على +30 XP`);
    }
  };

  useEffect(() => {
    if (seconds <= 0 && started) finish(typed, DURATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  const handleChange = (val: string) => {
    if (done) return;
    if (!started) setStarted(true);
    // play click on new char
    if (val.length > typed.length) sfx.click();
    if (val.length > sentence.length) return;
    setTyped(val);
    if (val === sentence) {
      const elapsed = DURATION - seconds;
      finish(val, elapsed || 1);
    }
  };

  const reset = () => {
    setSentence(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]);
    setTyped("");
    setSeconds(DURATION);
    setStarted(false);
    setDone(false);
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const liveStats = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < typed.length; i++) if (typed[i] === sentence[i]) correct++;
    const acc = typed.length ? Math.round((correct / typed.length) * 100) : 100;
    const elapsed = DURATION - seconds || 1;
    const wpm = Math.round((correct / 5) / (elapsed / 60));
    return { wpm: isFinite(wpm) ? wpm : 0, acc };
  }, [typed, sentence, seconds]);

  return (
    <div className="card-bg rounded-xl p-5 neon-breathe" style={{ borderColor: "var(--accent)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Keyboard className="w-5 h-5" style={{ color: "var(--accent)" }} />
        <h3 className="font-bold neon-heading" style={{ color: "var(--accent)" }}>⌨️ اختبار سرعة الكتابة</h3>
      </div>

      {/* Stat counters */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="stat-card-bg rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">السرعة WPM</div>
          <div className="text-2xl font-bold neon-text-gold neon-heading">{liveStats.wpm}</div>
        </div>
        <div className="stat-card-bg rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">الدقّة %</div>
          <div className="text-2xl font-bold neon-text-blue neon-heading">{liveStats.acc}</div>
        </div>
        <div className="stat-card-bg rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">الوقت</div>
          <div className={`text-2xl font-bold neon-heading ${seconds <= 10 ? "text-[#ef4444]" : "text-[#39ff14]"}`}>{seconds}s</div>
        </div>
      </div>

      {/* Sentence display */}
      <div
        dir="ltr"
        className="rounded-lg bg-[#0a1224] border border-[#1e2e4a] p-4 font-mono text-lg leading-relaxed mb-3 select-none cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {sentence.split("").map((c, i) => {
          let cls = "text-muted-foreground";
          if (i < typed.length) {
            cls = typed[i] === c
              ? "text-[#39ff14]"
              : "text-[#ef4444] bg-[#ef4444]/20";
          } else if (i === typed.length) {
            cls = "text-white bg-[#00d2ff]/40 animate-pulse";
          }
          return (
            <span key={i} className={cls} style={{ textShadow: i < typed.length && typed[i] === c ? "0 0 8px #39ff14" : undefined }}>
              {c}
            </span>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={typed}
        onChange={(e) => handleChange(e.target.value)}
        disabled={done}
        autoFocus
        placeholder="ابدأ الكتابة هنا..."
        className="w-full rounded-lg bg-[#0a1224] border border-[#00d2ff]/40 px-4 py-3 font-mono text-white focus:outline-none focus:border-[#00d2ff] focus:shadow-[0_0_12px_rgba(0,210,255,0.4)]"
        dir="ltr"
      />

      <div className="flex gap-2 mt-3">
        <Button onClick={reset} variant="outline" className="border-[#ffb703] text-[#ffb703] hover:bg-[#ffb703]/10">
          <RotateCcw className="w-4 h-4" /> جملة جديدة
        </Button>
        <div className="flex-1" />
        {result && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a1224] border border-[#39ff14]/40">
            <Trophy className="w-4 h-4 text-[#39ff14]" />
            <span className="text-sm">
              <span className="text-[#ffb703] font-bold">{result.wpm} WPM</span>
              {" · "}
              <span className="text-[#00d2ff] font-bold">{result.acc}%</span>
              {result.wpm >= 40 && <span className="text-[#39ff14] font-bold mr-2"> · +30 XP <Zap className="inline w-3 h-3" /></span>}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-3">
        🎯 الهدف: 40+ كلمة/دقيقة · مكافأة +30 XP عند تحقيقه
      </p>
    </div>
  );
}



/* ===== src/components/ui/accordion.tsx ===== */
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium cursor-pointer transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };



/* ===== src/components/ui/alert-dialog.tsx ===== */
import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className,
      )}
      {...props}
    />
  </AlertDialogPortal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};



/* ===== src/components/ui/alert.tsx ===== */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };



/* ===== src/components/ui/aspect-ratio.tsx ===== */
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

const AspectRatio = AspectRatioPrimitive.Root;

export { AspectRatio };



/* ===== src/components/ui/avatar.tsx ===== */
"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };



/* ===== src/components/ui/badge.tsx ===== */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };



/* ===== src/components/ui/breadcrumb.tsx ===== */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"nav"> & {
    separator?: React.ReactNode;
  }
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        "flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
        className,
      )}
      {...props}
    />
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<"a"> & {
    asChild?: boolean;
  }
>(({ asChild, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      className={cn("transition-colors hover:text-foreground", className)}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = "BreadcrumbPage";

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<"li">) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
    {...props}
  >
    {children ?? <ChevronRight />}
  </li>
);
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More</span>
  </span>
);
BreadcrumbEllipsis.displayName = "BreadcrumbElipssis";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};



/* ===== src/components/ui/button.tsx ===== */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };



/* ===== src/components/ui/calendar.tsx ===== */
"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-(--cell-size) w-(--cell-size) select-none p-0 aria-disabled:opacity-50",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] relative rounded-md border",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn("bg-popover absolute inset-0 opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "[&>svg]:text-muted-foreground flex h-8 items-center gap-1 rounded-md pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground flex-1 select-none rounded-md text-[0.8rem] font-normal",
          defaultClassNames.weekday,
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn(
          "text-muted-foreground select-none text-[0.8rem]",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day,
        ),
        range_start: cn("bg-accent rounded-l-md", defaultClassNames.range_start),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />;
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />;
          }

          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />;
          }

          return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex aspect-square h-auto w-full min-w-(--cell-size) flex-col gap-1 font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };



/* ===== src/components/ui/card.tsx ===== */
import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };



/* ===== src/components/ui/carousel.tsx ===== */
import * as React from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(({ orientation = "horizontal", opts, setApi, plugins, className, children, ...props }, ref) => {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) {
      return;
    }

    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollNext();
      }
    },
    [scrollPrev, scrollNext],
  );

  React.useEffect(() => {
    if (!api || !setApi) {
      return;
    }

    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) {
      return;
    }

    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        ref={ref}
        onKeyDownCapture={handleKeyDown}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { carouselRef, orientation } = useCarousel();

    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={ref}
          className={cn(
            "flex",
            orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { orientation } = useCarousel();

    return (
      <div
        ref={ref}
        role="group"
        aria-roledescription="slide"
        className={cn(
          "min-w-0 shrink-0 grow-0 basis-full",
          orientation === "horizontal" ? "pl-4" : "pt-4",
          className,
        )}
        {...props}
      />
    );
  },
);
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute  h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "-left-12 top-1/2 -translate-y-1/2"
            : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...props}
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  },
);
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "absolute h-8 w-8 rounded-full",
          orientation === "horizontal"
            ? "-right-12 top-1/2 -translate-y-1/2"
            : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
          className,
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...props}
      >
        <ArrowRight className="h-4 w-4" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
};



/* ===== src/components/ui/chart.tsx ===== */
import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, config]) => config.theme || config.color);

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref,
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null;
      }

      const [item] = payload;
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>
        );
      }

      if (!value) {
        return null;
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) {
      return null;
    }

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className,
        )}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {payload
            .filter((item) => item.type !== "none")
            .map((item, index) => {
              const key = `${nameKey || item.name || item.dataKey || "value"}`;
              const itemConfig = getPayloadConfigFromPayload(config, item, key);
              const indicatorColor = color || item.payload.fill || item.color;

              return (
                <div
                  key={item.dataKey}
                  className={cn(
                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                    indicator === "dot" && "items-center",
                  )}
                >
                  {formatter && item?.value !== undefined && item.name ? (
                    formatter(item.value, item.name, item, index, item.payload)
                  ) : (
                    <>
                      {itemConfig?.icon ? (
                        <itemConfig.icon />
                      ) : (
                        !hideIndicator && (
                          <div
                            className={cn(
                              "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                              {
                                "h-2.5 w-2.5": indicator === "dot",
                                "w-1": indicator === "line",
                                "w-0 border-[1.5px] border-dashed bg-transparent":
                                  indicator === "dashed",
                                "my-0.5": nestLabel && indicator === "dashed",
                              },
                            )}
                            style={
                              {
                                "--color-bg": indicatorColor,
                                "--color-border": indicatorColor,
                              } as React.CSSProperties
                            }
                          />
                        )
                      )}
                      <div
                        className={cn(
                          "flex flex-1 justify-between leading-none",
                          nestLabel ? "items-end" : "items-center",
                        )}
                      >
                        <div className="grid gap-1.5">
                          {nestLabel ? tooltipLabel : null}
                          <span className="text-muted-foreground">
                            {itemConfig?.label || item.name}
                          </span>
                        </div>
                        {item.value && (
                          <span className="font-mono font-medium tabular-nums text-foreground">
                            {item.value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    );
  },
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};



/* ===== src/components/ui/checkbox.tsx ===== */
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className={cn("grid place-content-center text-current")}>
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };



/* ===== src/components/ui/collapsible.tsx ===== */
"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };



/* ===== src/components/ui/command.tsx ===== */
"use client";

import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
));

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />
));

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className,
    )}
    {...props}
  />
));

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
};
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};



/* ===== src/components/ui/context-menu.tsx ===== */
import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

const ContextMenuGroup = ContextMenuPrimitive.Group;

const ContextMenuPortal = ContextMenuPrimitive.Portal;

const ContextMenuSub = ContextMenuPrimitive.Sub;

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",
      className,
    )}
    {...props}
  />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-context-menu-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold text-foreground", inset && "pl-8", className)}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
};
ContextMenuShortcut.displayName = "ContextMenuShortcut";

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};



/* ===== src/components/ui/dialog.tsx ===== */
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};



/* ===== src/components/ui/drawer.tsx ===== */
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};



/* ===== src/components/ui/dropdown-menu.tsx ===== */
"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className,
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span className={cn("ml-auto text-xs tracking-widest opacity-60", className)} {...props} />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};



/* ===== src/components/ui/form.tsx ===== */
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  if (!itemContext) {
    throw new Error("useFormField should be used within <FormItem>");
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[0.8rem] text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-[0.8rem] font-medium text-destructive", className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};



/* ===== src/components/ui/hover-card.tsx ===== */
import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;

const HoverCardTrigger = HoverCardPrimitive.Trigger;

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <HoverCardPrimitive.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn(
      "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-hover-card-content-transform-origin)",
      className,
    )}
    {...props}
  />
));
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName;

export { HoverCard, HoverCardTrigger, HoverCardContent };



/* ===== src/components/ui/input-otp.tsx ===== */
import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { Minus } from "lucide-react";

import { cn } from "@/lib/utils";

const InputOTP = React.forwardRef<
  React.ElementRef<typeof OTPInput>,
  React.ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName,
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
));
InputOTP.displayName = "InputOTP";

const InputOTPGroup = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
));
InputOTPGroup.displayName = "InputOTPGroup";

const InputOTPSlot = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div"> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index];

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
        isActive && "z-10 ring-1 ring-ring",
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
    </div>
  );
});
InputOTPSlot.displayName = "InputOTPSlot";

const InputOTPSeparator = React.forwardRef<
  React.ElementRef<"div">,
  React.ComponentPropsWithoutRef<"div">
>(({ ...props }, ref) => (
  <div ref={ref} role="separator" {...props}>
    <Minus />
  </div>
));
InputOTPSeparator.displayName = "InputOTPSeparator";

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };



/* ===== src/components/ui/input.tsx ===== */
import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };



/* ===== src/components/ui/label.tsx ===== */
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };



/* ===== src/components/ui/menubar.tsx ===== */
import * as React from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";
import { Check, ChevronRight, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

function MenubarMenu({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
  return <MenubarPrimitive.Menu {...props} />;
}

function MenubarGroup({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Group>) {
  return <MenubarPrimitive.Group {...props} />;
}

function MenubarPortal({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
  return <MenubarPrimitive.Portal {...props} />;
}

function MenubarRadioGroup({ ...props }: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
  return <MenubarPrimitive.RadioGroup {...props} />;
}

function MenubarSub({ ...props }: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
  return <MenubarPrimitive.Sub data-slot="menubar-sub" {...props} />;
}

const Menubar = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Root
    ref={ref}
    className={cn(
      "flex h-9 items-center space-x-1 rounded-md border bg-background p-1 shadow-sm",
      className,
    )}
    {...props}
  />
));
Menubar.displayName = MenubarPrimitive.Root.displayName;

const MenubarTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-3 py-1 text-sm font-medium outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      className,
    )}
    {...props}
  />
));
MenubarTrigger.displayName = MenubarPrimitive.Trigger.displayName;

const MenubarSubTrigger = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <MenubarPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </MenubarPrimitive.SubTrigger>
));
MenubarSubTrigger.displayName = MenubarPrimitive.SubTrigger.displayName;

const MenubarSubContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-menubar-content-transform-origin)",
      className,
    )}
    {...props}
  />
));
MenubarSubContent.displayName = MenubarPrimitive.SubContent.displayName;

const MenubarContent = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>
>(({ className, align = "start", alignOffset = -4, sideOffset = 8, ...props }, ref) => (
  <MenubarPrimitive.Portal>
    <MenubarPrimitive.Content
      ref={ref}
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-menubar-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </MenubarPrimitive.Portal>
));
MenubarContent.displayName = MenubarPrimitive.Content.displayName;

const MenubarItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));
MenubarItem.displayName = MenubarPrimitive.Item.displayName;

const MenubarCheckboxItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <MenubarPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.CheckboxItem>
));
MenubarCheckboxItem.displayName = MenubarPrimitive.CheckboxItem.displayName;

const MenubarRadioItem = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <MenubarPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <MenubarPrimitive.ItemIndicator>
        <Circle className="h-4 w-4 fill-current" />
      </MenubarPrimitive.ItemIndicator>
    </span>
    {children}
  </MenubarPrimitive.RadioItem>
));
MenubarRadioItem.displayName = MenubarPrimitive.RadioItem.displayName;

const MenubarLabel = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <MenubarPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className)}
    {...props}
  />
));
MenubarLabel.displayName = MenubarPrimitive.Label.displayName;

const MenubarSeparator = React.forwardRef<
  React.ElementRef<typeof MenubarPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <MenubarPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
MenubarSeparator.displayName = MenubarPrimitive.Separator.displayName;

const MenubarShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
};
MenubarShortcut.displayname = "MenubarShortcut";

export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
};



/* ===== src/components/ui/navigation-menu.tsx ===== */
import * as React from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import { cva } from "class-variance-authority";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

const NavigationMenu = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Root
    ref={ref}
    className={cn("relative z-10 flex max-w-max flex-1 items-center justify-center", className)}
    {...props}
  >
    {children}
    <NavigationMenuViewport />
  </NavigationMenuPrimitive.Root>
));
NavigationMenu.displayName = NavigationMenuPrimitive.Root.displayName;

const NavigationMenuList = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.List
    ref={ref}
    className={cn("group flex flex-1 list-none items-center justify-center space-x-1", className)}
    {...props}
  />
));
NavigationMenuList.displayName = NavigationMenuPrimitive.List.displayName;

const NavigationMenuItem = NavigationMenuPrimitive.Item;

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=open]:text-accent-foreground data-[state=open]:bg-accent/50 data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent",
);

const NavigationMenuTrigger = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <NavigationMenuPrimitive.Trigger
    ref={ref}
    className={cn(navigationMenuTriggerStyle(), "group", className)}
    {...props}
  >
    {children}{" "}
    <ChevronDown
      className="relative top-[1px] ml-1 h-3 w-3 transition duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true"
    />
  </NavigationMenuPrimitive.Trigger>
));
NavigationMenuTrigger.displayName = NavigationMenuPrimitive.Trigger.displayName;

const NavigationMenuContent = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Content
    ref={ref}
    className={cn(
      "left-0 top-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 md:absolute md:w-auto ",
      className,
    )}
    {...props}
  />
));
NavigationMenuContent.displayName = NavigationMenuPrimitive.Content.displayName;

const NavigationMenuLink = NavigationMenuPrimitive.Link;

const NavigationMenuViewport = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <div className={cn("absolute left-0 top-full flex justify-center")}>
    <NavigationMenuPrimitive.Viewport
      className={cn(
        "origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  </div>
));
NavigationMenuViewport.displayName = NavigationMenuPrimitive.Viewport.displayName;

const NavigationMenuIndicator = React.forwardRef<
  React.ElementRef<typeof NavigationMenuPrimitive.Indicator>,
  React.ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>
>(({ className, ...props }, ref) => (
  <NavigationMenuPrimitive.Indicator
    ref={ref}
    className={cn(
      "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in",
      className,
    )}
    {...props}
  >
    <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
  </NavigationMenuPrimitive.Indicator>
));
NavigationMenuIndicator.displayName = NavigationMenuPrimitive.Indicator.displayName;

export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
};



/* ===== src/components/ui/pagination.tsx ===== */
import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import { ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  ),
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("", className)} {...props} />,
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">;

const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className,
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pr-2.5", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};



/* ===== src/components/ui/popover.tsx ===== */
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };



/* ===== src/components/ui/progress.tsx ===== */
"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };



/* ===== src/components/ui/radio-group.tsx ===== */
import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2", className)} {...props} ref={ref} />;
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-primary" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };



/* ===== src/components/ui/resizable.tsx ===== */
import { GripVertical } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}) => (
  <Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };



/* ===== src/components/ui/scroll-area.tsx ===== */
import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };



/* ===== src/components/ui/select.tsx ===== */
"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className,
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};



/* ===== src/components/ui/separator.tsx ===== */
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";

import { cn } from "@/lib/utils";

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className,
    )}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };



/* ===== src/components/ui/sheet.tsx ===== */
"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};



/* ===== src/components/ui/sidebar.tsx ===== */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile();
    const [openMobile, setOpenMobile] = React.useState(false);

    // This is the internal state of the sidebar.
    // We use openProp and setOpenProp for control from outside the component.
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }

        // This sets the cookie to keep the sidebar state.
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [setOpenProp, open],
    );

    // Helper to toggle the sidebar.
    const toggleSidebar = React.useCallback(() => {
      return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile]);

    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH,
                "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
              className,
            )}
            ref={ref}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar" | "floating" | "inset";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>(
  (
    {
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (collapsible === "none") {
      return (
        <div
          className={cn(
            "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
            className,
          )}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
            style={
              {
                "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
              } as React.CSSProperties
            }
            side={side}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Sidebar</SheetTitle>
              <SheetDescription>Displays the mobile sidebar.</SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <div
        ref={ref}
        className="group peer hidden text-sidebar-foreground md:block"
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-variant={variant}
        data-side={side}
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          className={cn(
            "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
            "group-data-[collapsible=offcanvas]:w-0",
            "group-data-[side=right]:rotate-180",
            variant === "floating" || variant === "inset"
              ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          )}
        />
        <div
          className={cn(
            "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
            side === "left"
              ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
              : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
            // Adjust the padding for floating and inset variants.
            variant === "floating" || variant === "inset"
              ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
              : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
            className,
          )}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"
          >
            {children}
          </div>
        </div>
      </div>
    );
  },
);
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar();

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
          "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
          "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
          "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
          "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
          "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarRail.displayName = "SidebarRail";

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"main">>(
  ({ className, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn(
          "relative flex w-full flex-1 flex-col bg-background",
          "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarInset.displayName = "SidebarInset";

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className,
      )}
      {...props}
    />
  );
});
SidebarInput.displayName = "SidebarInput";

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="header"
        className={cn("flex flex-col gap-2 p-2", className)}
        {...props}
      />
    );
  },
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="footer"
        className={cn("flex flex-col gap-2 p-2", className)}
        {...props}
      />
    );
  },
);
SidebarFooter.displayName = "SidebarFooter";

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
});
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="content"
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
          className,
        )}
        {...props}
      />
    );
  },
);
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="group"
        className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
        {...props}
      />
    );
  },
);
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  ),
);
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  ),
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring cursor-pointer transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]",
      },
      size: {
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    if (!tooltip) {
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = {
        children: tooltip,
      };
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="center"
          hidden={state !== "collapsed" || isMobile}
          {...tooltip}
        />
      </Tooltip>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 after:md:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
        "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean;
  }
>(({ className, showIcon = false, ...props }, ref) => {
  // Random width between 50 to 90%.
  const width = React.useMemo(() => {
    return `${Math.floor(Math.random() * 40) + 50}%`;
  }, []);

  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      data-sidebar="menu-sub"
      className={cn(
        "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  ),
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(
  ({ ...props }, ref) => <li ref={ref} {...props} />,
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        "group-data-[collapsible=icon]:hidden",
        className,
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};



/* ===== src/components/ui/skeleton.tsx ===== */
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
}

export { Skeleton };



/* ===== src/components/ui/slider.tsx ===== */
import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };



/* ===== src/components/ui/sonner.tsx ===== */
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };



/* ===== src/components/ui/switch.tsx ===== */
import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };



/* ===== src/components/ui/table.tsx ===== */
import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };



/* ===== src/components/ui/tabs.tsx ===== */
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };



/* ===== src/components/ui/textarea.tsx ===== */
import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };



/* ===== src/components/ui/toggle-group.tsx ===== */
"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
});

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };



/* ===== src/components/ui/toggle.tsx ===== */
import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-2 min-w-9",
        sm: "h-8 px-1.5 min-w-8",
        lg: "h-10 px-2.5 min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };



/* ===== src/components/ui/tooltip.tsx ===== */
"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };



/* ===== src/components/WeeklyReport.tsx ===== */
"use client";

import { useMemo, useState } from "react";
import { useDisciplineStore } from "@/hooks/useDisciplineStore";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { APP_PASSWORD, AUTH_HEADER } from "@/lib/auth-config";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Activity, Apple, BookOpen, Flame } from "lucide-react";
import TiltCard from "@/components/TiltCard";

interface Metric {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: string;
}

export default function WeeklyReport() {
  const store = useDisciplineStore();
  const [aiText, setAiText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const endDay = store.day;
    const startDay = Math.max(1, endDay - 6);
    let exercise = 0, meal = 0, english = 0, nutrition = 0;
    let prayers = 0, prayerTotal = 0;
    let xp = 0, violations = 0;
    const days = endDay - startDay + 1;
    for (let d = startDay; d <= endDay; d++) {
      const dd = store.dayData[d];
      if (!dd) continue;
      if (dd.exerciseDone) exercise++;
      if (dd.mealDone) meal++;
      if (dd.englishDone) english++;
      if (dd.nutritionDone) nutrition++;
      prayers += Object.values(dd.prayers).filter(Boolean).length;
      prayerTotal += 5;
      xp += dd.xp || 0;
      violations += dd.violations || 0;
    }
    return { startDay, endDay, days, exercise, meal, english, nutrition, prayers, prayerTotal, xp, violations };
  }, [store.day, store.dayData]);

  const metrics: Metric[] = [
    { label: "التمارين 💪", value: stats.exercise, total: stats.days, icon: Activity, color: "#39ff14" },
    { label: "الوجبات 🍽️", value: stats.meal, total: stats.days, icon: Apple, color: "#ffb703" },
    { label: "التغذية 🥗", value: stats.nutrition, total: stats.days, icon: Apple, color: "#00d2ff" },
    { label: "الإنجليزية 📚", value: stats.english, total: stats.days, icon: BookOpen, color: "#8a2be2" },
    { label: "الصلوات 🕌", value: stats.prayers, total: stats.prayerTotal, icon: Sparkles, color: "#ffb703" },
  ];

  const overall = Math.round(
    (metrics.reduce((s, m) => s + (m.total ? m.value / m.total : 0), 0) / metrics.length) * 100,
  );

  const rank = overall >= 90 ? "🔥 HACKER ELITE"
    : overall >= 75 ? "⚡ ADVANCED"
    : overall >= 50 ? "🎯 RISING"
    : overall >= 25 ? "🟡 ROOKIE"
    : "💤 IDLE";

  const generateAi = async () => {
    setLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", [AUTH_HEADER]: APP_PASSWORD },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `أنت مدرب انضباط بأسلوب هكر فخم. حلل أدائي الأسبوعي (من اليوم ${stats.startDay} إلى ${stats.endDay}):
- التمارين: ${stats.exercise}/${stats.days}
- الوجبات: ${stats.meal}/${stats.days}
- التغذية: ${stats.nutrition}/${stats.days}
- الإنجليزية: ${stats.english}/${stats.days}
- الصلوات: ${stats.prayers}/${stats.prayerTotal}
- المخالفات: ${stats.violations}
- مجموع XP: ${stats.xp}
- النسبة العامة: ${overall}%

اكتب تقرير قصير قوي (5-7 أسطر) بلهجة سعودية، يبدأ بحكم على الأسبوع، ثم نقاط القوة، ثم نقاط الضعف، ثم خطة الأسبوع الجاي بصرامة. استخدم إيموجي.`,
          }],
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setAiText(acc);
      }
    } catch (e) {
      toast.error("فشل توليد التقرير");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <TiltCard className="card-bg rounded-xl p-5 neon-breathe" style={{ borderColor: "#00d2ff" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold neon-heading text-[#00d2ff]">📊 تقرير أداء هكر</h2>
            <p className="text-xs text-muted-foreground mt-1">
              الأسبوع: اليوم {stats.startDay} → {stats.endDay}
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#ffb703]">{overall}%</div>
            <div className="text-xs text-[#39ff14] font-bold">{rank}</div>
          </div>
        </div>
        <Progress value={overall} className="h-2" />
      </TiltCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metrics.map((m) => {
          const pct = m.total ? Math.round((m.value / m.total) * 100) : 0;
          const Icon = m.icon;
          return (
            <TiltCard key={m.label} intensity={5} className="card-bg rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: m.color }} />
                  <span className="text-sm font-bold">{m.label}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: m.color }}>
                  {m.value}/{m.total}
                </span>
              </div>
              <div className="h-2 bg-[#0a1224] rounded-full overflow-hidden border border-[#1e2e4a]">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: m.color }} />
              </div>
            </TiltCard>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TiltCard intensity={4} className="stat-card-bg rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-[#ffb703] mx-auto mb-1" />
          <div className="text-2xl font-bold text-[#ffb703]">{stats.xp}</div>
          <div className="text-xs text-muted-foreground">XP الأسبوع</div>
        </TiltCard>
        <TiltCard intensity={4} className="stat-card-bg rounded-xl p-3 text-center">
          <Flame className="w-5 h-5 text-[#ef4444] mx-auto mb-1" />
          <div className="text-2xl font-bold text-[#ef4444]">{stats.violations}</div>
          <div className="text-xs text-muted-foreground">مخالفات</div>
        </TiltCard>
      </div>

      <div className="card-bg rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold neon-heading text-[#ffb703]">🧠 تحليل AI</h3>
          <Button onClick={generateAi} disabled={loading} size="sm" className="bg-gradient-to-r from-[#ffb703] to-[#d49a00] text-black font-bold">
            {loading ? "جاري التحليل..." : "ولّد التقرير"}
          </Button>
        </div>
        <div className="min-h-24 text-sm whitespace-pre-wrap leading-relaxed text-[#a0aec0]">
          {aiText || "اضغط الزر لتوليد تقرير أداء هكر مفصل بالذكاء الاصطناعي."}
        </div>
      </div>
    </div>
  );
}



/* ===== src/components/WeightGoalCard.tsx ===== */
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scale, Target, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface WeightRecord {
  day: number;
  weight: number;
  measurement: number;
  notes: string;
  date: string;
}

interface Props {
  currentWeight: number;
  history: WeightRecord[];
  day: number;
  onAddWeight: (w: number, m: number, notes: string) => void;
}

const GOAL_MIN = 75;
const GOAL_MAX = 78;

export default function WeightGoalCard({ currentWeight, history, day, onAddWeight }: Props) {
  const [w, setW] = useState("");
  const [m, setM] = useState("");

  const last = history[history.length - 1];
  const prev = history[history.length - 2];

  const stats = useMemo(() => {
    if (!last) return null;
    const goalMid = (GOAL_MIN + GOAL_MAX) / 2;
    const remaining = last.weight - goalMid;
    const inGoal = last.weight >= GOAL_MIN && last.weight <= GOAL_MAX;
    const delta = prev ? last.weight - prev.weight : 0;
    const start = history[0]?.weight ?? last.weight;
    const totalLost = start - last.weight;
    return { remaining, inGoal, delta, totalLost, start };
  }, [last, prev, history]);

  const submit = () => {
    const wn = parseFloat(w);
    const mn = parseFloat(m);
    if (!wn || wn < 30 || wn > 250) {
      toast.error("أدخل وزن صحيح بين 30 و 250 كجم");
      return;
    }
    onAddWeight(wn, isNaN(mn) ? 0 : mn, "");
    setW(""); setM("");
    if (stats && wn < stats.start && (!prev || wn < prev.weight)) {
      toast.success("🔥 ممتاز! نزلت بالوزن — استمر يا بطل!");
    } else if (wn >= GOAL_MIN && wn <= GOAL_MAX) {
      toast.success("🎯 وصلت لنطاق الهدف! إنجاز عظيم!");
    }
  };

  return (
    <div className="card-bg rounded-xl p-5 neon-breathe" style={{ borderColor: "var(--gold)" }}>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5" style={{ color: "var(--gold)" }} />
        <h3 className="font-bold neon-heading" style={{ color: "var(--gold)" }}>🎯 هدف الوزن — {GOAL_MIN}-{GOAL_MAX} كجم</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="stat-card-bg rounded-lg p-3 text-center">
          <Scale className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--accent)" }} />
          <div className="text-xs text-muted-foreground">الحالي</div>
          <div className="text-lg font-bold neon-text-gold">{currentWeight > 0 ? `${currentWeight}` : "—"} كجم</div>
        </div>
        <div className="stat-card-bg rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">المتبقي للهدف</div>
          <div className={`text-lg font-bold ${stats?.inGoal ? "text-[#39ff14]" : "text-[#ffb703]"}`}>
            {stats ? (stats.inGoal ? "🎉 وصلت!" : `${Math.abs(stats.remaining).toFixed(1)} كجم`) : "—"}
          </div>
        </div>
        <div className="stat-card-bg rounded-lg p-3 text-center">
          {stats && stats.delta < 0 ? <TrendingDown className="w-4 h-4 mx-auto mb-1 text-[#39ff14]" /> : <TrendingUp className="w-4 h-4 mx-auto mb-1 text-[#ef4444]" />}
          <div className="text-xs text-muted-foreground">آخر تغيير</div>
          <div className={`text-lg font-bold ${stats && stats.delta < 0 ? "text-[#39ff14]" : "text-[#ef4444]"}`}>
            {stats && prev ? `${stats.delta > 0 ? "+" : ""}${stats.delta.toFixed(1)}` : "—"}
          </div>
        </div>
        <div className="stat-card-bg rounded-lg p-3 text-center">
          <div className="text-xs text-muted-foreground">إجمالي النزول</div>
          <div className="text-lg font-bold text-[#39ff14]">
            {stats ? `${stats.totalLost.toFixed(1)} كجم` : "—"}
          </div>
        </div>
      </div>

      {/* Progress to goal */}
      {stats && stats.start > GOAL_MAX && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#00d2ff]">التقدّم نحو الهدف</span>
            <span className="text-[#ffb703]">
              {Math.min(100, Math.max(0, ((stats.start - (last?.weight ?? stats.start)) / (stats.start - (GOAL_MIN + GOAL_MAX) / 2)) * 100)).toFixed(0)}%
            </span>
          </div>
          <div className="xp-bar-bg rounded-full h-3 overflow-hidden">
            <div
              className="xp-bar-fill h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, ((stats.start - (last?.weight ?? stats.start)) / (stats.start - (GOAL_MIN + GOAL_MAX) / 2)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input type="number" step="0.1" placeholder="الوزن (كجم)" value={w} onChange={(e) => setW(e.target.value)} className="bg-[#0a1224] border-[#1e2e4a]" />
        <Input type="number" step="0.1" placeholder="القياس (سم) — اختياري" value={m} onChange={(e) => setM(e.target.value)} className="bg-[#0a1224] border-[#1e2e4a]" />
      </div>
      <Button onClick={submit} className="w-full gold-gradient text-black font-bold">
        تسجيل وزن اليوم {day}
      </Button>

      {history.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-muted-foreground mb-2">آخر 5 قياسات:</div>
          <div className="space-y-1">
            {history.slice(-5).reverse().map((h, i) => (
              <div key={i} className="flex justify-between text-xs bg-[#0a1224] rounded px-2 py-1 border border-[#1e2e4a]">
                <span>يوم {h.day}</span>
                <span className="text-[#ffb703] font-bold">{h.weight} كجم</span>
                <span className="text-muted-foreground">{new Date(h.date).toLocaleDateString("ar")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



/* ===== src/hooks/use-mobile.tsx ===== */
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}



/* ===== src/hooks/useDisciplineStore.ts ===== */
import { useState, useEffect, useCallback } from "react";

export interface WeightRecord {
  day: number;
  weight: number;
  measurement: number;
  notes: string;
  date: string;
}

export interface ChatMessage {
  role: "user" | "bot";
  text: string;
  image?: string;
}

export interface DayData {
  prayers: Record<string, boolean>;
  tasks: Record<string, boolean>;
  customTasks: Record<string, boolean>;
  azkar: Record<string, number>;
  water: Record<string, boolean>;
  exerciseClaims: Record<string, boolean>;
  exerciseDone: boolean;
  mealDone: boolean;
  englishDone: boolean;
  nutritionDone: boolean;
  violations: number;
  xp: number;
}


interface StoreState {
  day: number;
  streak: number;
  level: number;
  totalXP: number;
  currentWeight: number;
  customTasks: string[];
  dayData: Record<number, DayData>;
  weightHistory: WeightRecord[];
  chatHistory: ChatMessage[];
  rewardsClaimed: string[];
  timerRunning: boolean;
  timerSeconds: number;
  exerciseTime: string;
  showViolationModal: boolean;
}

const STORAGE_KEY = "wael-discipline-v9";

const defaultDayData = (): DayData => ({
  prayers: {},
  tasks: {},
  customTasks: {},
  azkar: {},
  water: {},
  exerciseClaims: {},
  exerciseDone: false,
  mealDone: false,
  englishDone: false,
  nutritionDone: false,
  violations: 0,
  xp: 0,
});


function loadState(): Partial<StoreState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function saveState(state: StoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useDisciplineStore() {
  const saved = loadState();

  const [day, setDay] = useState(saved.day ?? 1);
  const [streak, setStreak] = useState(saved.streak ?? 0);
  const [level, setLevel] = useState(saved.level ?? 1);
  const [totalXP, setTotalXP] = useState(saved.totalXP ?? 0);
  const [currentWeight, setCurrentWeight] = useState(saved.currentWeight ?? 0);
  const [customTasks, setCustomTasks] = useState<string[]>(saved.customTasks ?? []);
  const [dayData, setDayData] = useState<Record<number, DayData>>(saved.dayData ?? {});
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>(saved.weightHistory ?? []);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(saved.chatHistory ?? []);
  const [rewardsClaimed, setRewardsClaimed] = useState<string[]>(saved.rewardsClaimed ?? []);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [exerciseTime, setExerciseTime] = useState(saved.exerciseTime ?? "17:00");
  const [showViolationModal, setShowViolationModal] = useState(false);

  // Persist on change
  useEffect(() => {
    const state: StoreState = {
      day,
      streak,
      level,
      totalXP,
      currentWeight,
      customTasks,
      dayData,
      weightHistory,
      chatHistory,
      rewardsClaimed,
      timerRunning,
      timerSeconds,
      exerciseTime,
      showViolationModal,
    };
    saveState(state);
  }, [day, streak, level, totalXP, currentWeight, customTasks, dayData, weightHistory, chatHistory, rewardsClaimed, timerRunning, timerSeconds, exerciseTime, showViolationModal]);

  const getToday = useCallback((): DayData => {
    return dayData[day] ?? defaultDayData();
  }, [dayData, day]);

  const updateToday = useCallback((patch: Partial<DayData>) => {
    setDayData((prev) => {
      const current = prev[day] ?? defaultDayData();
      return { ...prev, [day]: { ...current, ...patch } };
    });
  }, [day]);

  const togglePrayer = useCallback((prayerId: string) => {
    const today = getToday();
    const newPrayers = { ...today.prayers, [prayerId]: !today.prayers[prayerId] };
    const prayerXP = newPrayers[prayerId] ? 10 : -10;
    updateToday({ prayers: newPrayers, xp: today.xp + prayerXP });
    if (newPrayers[prayerId]) setTotalXP((x) => x + 10);
    else setTotalXP((x) => x - 10);
  }, [getToday, updateToday]);

  const toggleTask = useCallback((taskId: string, xp: number) => {
    const today = getToday();
    const newTasks = { ...today.tasks, [taskId]: !today.tasks[taskId] };
    const delta = newTasks[taskId] ? xp : -xp;
    updateToday({ tasks: newTasks, xp: today.xp + delta });
    setTotalXP((x) => x + delta);
  }, [getToday, updateToday]);

  const toggleCustomTask = useCallback((taskId: string) => {
    const today = getToday();
    const newCustom = { ...today.customTasks, [taskId]: !today.customTasks[taskId] };
    const delta = newCustom[taskId] ? 15 : -15;
    updateToday({ customTasks: newCustom, xp: today.xp + delta });
    setTotalXP((x) => x + delta);
  }, [getToday, updateToday]);

  const addCustomTask = useCallback((name: string) => {
    if (name.trim()) {
      setCustomTasks((prev) => [...prev, name.trim()]);
    }
  }, []);

  const removeCustomTask = useCallback((index: number) => {
    setCustomTasks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const incrementAzkar = useCallback((zkrId: string, maxCount: number) => {
    const today = getToday();
    const currentCount = today.azkar[zkrId] ?? 0;
    const newCount = currentCount >= maxCount ? 0 : currentCount + 1;
    const newAzkar = { ...today.azkar, [zkrId]: newCount };
    let deltaXP = 0;
    if (newCount === maxCount && currentCount < maxCount) deltaXP = 2;
    if (newCount === 0 && currentCount >= maxCount) deltaXP = -2;
    updateToday({ azkar: newAzkar, xp: today.xp + deltaXP });
    if (deltaXP !== 0) setTotalXP((x) => x + deltaXP);
  }, [getToday, updateToday]);

  const toggleWater = useCallback((waterId: string) => {
    const today = getToday();
    const newWater = { ...today.water, [waterId]: !today.water[waterId] };
    updateToday({ water: newWater });
  }, [getToday, updateToday]);

  const markExercise = useCallback((done: boolean) => {
    const today = getToday();
    if (today.exerciseDone === done) return;
    const delta = done ? 25 : -25;
    updateToday({ exerciseDone: done, xp: today.xp + delta });
    setTotalXP((x) => x + delta);
  }, [getToday, updateToday]);

  // Click an individual exercise to earn one-time XP (per day)
  const claimExerciseXP = useCallback((exerciseId: string, xp = 8): boolean => {
    const today = getToday();
    if (today.exerciseClaims?.[exerciseId]) return false;
    const claims = { ...(today.exerciseClaims ?? {}), [exerciseId]: true };
    updateToday({ exerciseClaims: claims, xp: today.xp + xp });
    setTotalXP((x) => x + xp);
    return true;
  }, [getToday, updateToday]);


  const markMeal = useCallback((done: boolean) => {
    const today = getToday();
    if (today.mealDone === done) return;
    const delta = done ? 15 : -15;
    updateToday({ mealDone: done, xp: today.xp + delta });
    setTotalXP((x) => x + delta);
  }, [getToday, updateToday]);

  const markEnglish = useCallback((done: boolean) => {
    const today = getToday();
    if (today.englishDone === done) return;
    const delta = done ? 20 : -20;
    updateToday({ englishDone: done, xp: today.xp + delta });
    setTotalXP((x) => x + delta);
  }, [getToday, updateToday]);

  const markNutrition = useCallback((done: boolean) => {
    const today = getToday();
    if (today.nutritionDone === done) return;
    const delta = done ? 15 : -15;
    updateToday({ nutritionDone: done, xp: today.xp + delta });
    setTotalXP((x) => x + delta);
  }, [getToday, updateToday]);

  const addWeight = useCallback((weight: number, measurement: number, notes: string) => {
    const record: WeightRecord = {
      day,
      weight,
      measurement,
      notes,
      date: new Date().toISOString(),
    };
    setWeightHistory((prev) => [...prev, record]);
    setCurrentWeight(weight);
  }, [day]);

  const addChatMessage = useCallback((role: "user" | "bot", text: string) => {
    setChatHistory((prev) => [...prev, { role, text }]);
  }, []);

  const addChatImage = useCallback((image: string, caption = "") => {
    setChatHistory((prev) => [...prev, { role: "bot", text: caption, image }]);
  }, []);

  const updateLastBotMessage = useCallback((text: string) => {
    setChatHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      if (last.role === "bot") next[next.length - 1] = { ...last, text };
      return next;
    });
  }, []);

  const deleteChatMessage = useCallback((index: number) => {
    setChatHistory((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);


  const addBonusXP = useCallback((amount: number) => {
    if (!amount) return;
    setTotalXP((x) => x + amount);
    setDayData((prev) => {
      const current = prev[day] ?? defaultDayData();
      return { ...prev, [day]: { ...current, xp: current.xp + amount } };
    });
  }, [day]);

  const claimReward = useCallback((rewardId: string, cost: number) => {
    if (totalXP >= cost) {
      setRewardsClaimed((prev) => [...prev, rewardId]);
      setTotalXP((x) => x - cost);
      return true;
    }
    return false;
  }, [totalXP]);

  const reportViolation = useCallback(() => {
    const today = getToday();
    updateToday({ violations: today.violations + 1, xp: today.xp - 30 });
    setTotalXP((x) => x - 30);
    setStreak(0);
  }, [getToday, updateToday]);

  const nextDay = useCallback(() => {
    if (day < 90) {
      const today = getToday();
      // Check if day was productive for streak
      const allPrayers = Object.values(today.prayers).filter(Boolean).length;
      if (allPrayers >= 4 && today.exerciseDone && today.mealDone) {
        setStreak((s) => s + 1);
      }
      setDay((d) => d + 1);
    }
  }, [day, getToday]);

  const prevDay = useCallback(() => {
    if (day > 1) setDay((d) => d - 1);
  }, [day]);

  const exportData = useCallback(() => {
    const state = loadState();
    return btoa(encodeURIComponent(JSON.stringify(state)));
  }, []);

  const importData = useCallback((code: string) => {
    try {
      const decoded = JSON.parse(decodeURIComponent(atob(code)));
      if (decoded.day !== undefined) {
        setDay(decoded.day);
        setStreak(decoded.streak ?? 0);
        setLevel(decoded.level ?? 1);
        setTotalXP(decoded.totalXP ?? 0);
        setCurrentWeight(decoded.currentWeight ?? 0);
        setCustomTasks(decoded.customTasks ?? []);
        setDayData(decoded.dayData ?? {});
        setWeightHistory(decoded.weightHistory ?? []);
        setChatHistory(decoded.chatHistory ?? []);
        setRewardsClaimed(decoded.rewardsClaimed ?? []);
        setExerciseTime(decoded.exerciseTime ?? "17:00");
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  const xpForNextLevel = level * 500;
  const xpProgress = Math.min((totalXP / xpForNextLevel) * 100, 100);

  return {
    day,
    streak,
    level,
    totalXP,
    xpProgress,
    xpForNextLevel,
    currentWeight,
    customTasks,
    dayData,
    weightHistory,
    chatHistory,
    rewardsClaimed,
    timerRunning,
    timerSeconds,
    exerciseTime,
    showViolationModal,
    setTimerRunning,
    setTimerSeconds,
    setExerciseTime,
    setShowViolationModal,
    getToday,
    togglePrayer,
    toggleTask,
    toggleCustomTask,
    addCustomTask,
    removeCustomTask,
    incrementAzkar,
    toggleWater,
    markExercise,
    claimExerciseXP,
    markMeal,
    markEnglish,
    markNutrition,
    addWeight,
    addChatMessage,
    addChatImage,
    updateLastBotMessage,
    deleteChatMessage,
    clearChatHistory,
    claimReward,
    addBonusXP,
    reportViolation,
    nextDay,
    prevDay,
    exportData,
    importData,
  };
}



/* ===== src/hooks/useSoundEffects.ts ===== */
"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * WebAudio-based retro/sci-fi sound effects. No external assets.
 * Auto-attaches a global click listener for buttons.
 */
export function useSoundEffects(enabled = true) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);

  const beep = useCallback(
    (freq: number, duration = 0.08, type: OscillatorType = "square", vol = 0.05) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, ctx.currentTime);
      g.gain.setValueAtTime(vol, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + duration);
    },
    [enabled, getCtx],
  );

  const click = useCallback(() => beep(880, 0.05, "square", 0.04), [beep]);
  const success = useCallback(() => {
    beep(660, 0.08, "triangle", 0.06);
    setTimeout(() => beep(990, 0.1, "triangle", 0.06), 80);
  }, [beep]);
  const levelUp = useCallback(() => {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => beep(f, 0.16, "triangle", 0.08), i * 110));
  }, [beep]);
  const error = useCallback(() => beep(180, 0.18, "sawtooth", 0.05), [beep]);

  // Global click sound on any <button>
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest("button, [role='button']");
      if (btn && !btn.hasAttribute("data-silent")) click();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [enabled, click]);

  return { click, success, levelUp, error, beep };
}



/* ===== src/integrations/supabase/auth-attacher.ts ===== */
// This file is automatically generated. Do not edit it directly.
import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  },
)



/* ===== src/integrations/supabase/auth-middleware.ts ===== */
// This file is automatically generated. Do not edit it directly.
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'



export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }
    
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error('Unauthorized: Invalid token');
    }

    if (!data.claims.sub) {
      throw new Error('Unauthorized: No user ID found in token');
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);



/* ===== src/integrations/supabase/client.server.ts ===== */
// This file is automatically generated. Do not edit it directly.
// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
// For user-authenticated queries (with RLS), use the auth middleware instead.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Import like: import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});



/* ===== src/integrations/supabase/client.ts ===== */
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

function createSupabaseClient() {
  // Use import.meta.env for client-side (Vite build-time replacement)
  // Fall back to process.env for SSR (server-side rendering)
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});




/* ===== src/integrations/supabase/types.ts ===== */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const



/* ===== src/lib/ai-gateway.server.ts ===== */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const createLovableAiGatewayProvider = (lovableApiKey: string) =>
  createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });



/* ===== src/lib/auth-config.ts ===== */
// Shared password gate. Client + server both check the same value.
// Header used: X-App-Password
export const APP_PASSWORD = "weilx777";
export const AUTH_HEADER = "x-app-password";
export const AUTH_STORAGE_KEY = "wael-app-auth";

export function checkAuthHeader(request: Request): boolean {
  const h = request.headers.get(AUTH_HEADER) ?? request.headers.get("X-App-Password");
  return h === APP_PASSWORD;
}



/* ===== src/lib/daily.ts ===== */
// Deterministic daily rotation utilities — same day → same selection for all users.
export function dayOfYear(d = new Date()): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Mulberry32 PRNG seeded by day
export function seededRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  const rng = seededRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickDaily<T>(arr: readonly T[], count: number, salt = 0): T[] {
  const seed = dayOfYear() * 1000 + salt;
  return seededShuffle(arr, seed).slice(0, Math.min(count, arr.length));
}



/* ===== src/lib/data.ts ===== */
import pushupImg from "@/assets/exercises/pushup.jpg";
import squatImg from "@/assets/exercises/squat.jpg";
import plankImg from "@/assets/exercises/plank.jpg";
import legraiseImg from "@/assets/exercises/legraise.jpg";
import bicycleImg from "@/assets/exercises/bicycle.jpg";
import bridgeImg from "@/assets/exercises/bridge.jpg";
import jogImg from "@/assets/exercises/jog.jpg";
import jumpropeImg from "@/assets/exercises/jumprope.jpg";
import eggsImg from "@/assets/meals/eggs.jpg";
import chickenImg from "@/assets/meals/chicken.jpg";
import tunaImg from "@/assets/meals/tuna.jpg";
import oatsImg from "@/assets/meals/oats.jpg";
import yogurtImg from "@/assets/meals/yogurt.jpg";
import fishImg from "@/assets/meals/fish.jpg";


export interface Prayer {
  id: string;
  name: string;
  label: string;
  xp: number;
}

export interface ZkrItem {
  id: string;
  text: string;
  count: number;
  category: "morning" | "evening" | "sleep";
}

export interface Meal {
  id: string;
  category: "breakfast" | "snack" | "lunch" | "dinner";
  letter: string;
  name: string;
  description: string;
  image: string;
}


export interface Exercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  dayType: string;
  description: string;
  image: string;
}

export const prayers: Prayer[] = [
  { id: "fajr", name: "الفجر", label: "صلاة الفجر في جماعة مع أذكار الصباح 🌅", xp: 10 },
  { id: "dhuhr", name: "الظهر", label: "صلاة الظهر في وقتها والالتزام بالسنن الرواتب ☀️", xp: 10 },
  { id: "asr", name: "العصر", label: "صلاة العصر بخشوع تام ⚡", xp: 10 },
  { id: "maghrib", name: "المغرب", label: "صلاة المغرب وأذكار المساء 🌆", xp: 10 },
  { id: "isha", name: "العشاء", label: "صلاة العشاء جماعة لتأمين بداية ليلة هادئة 🌌", xp: 10 },
];

export const dailyTasks = [
  { id: "wake", name: "الاستيقاظ المبكر (قبل 6 ص) 🌅", xp: 15 },
  { id: "cold", name: "دش ماء بارد 🥶", xp: 10 },
  { id: "reading", name: "قراءة 10 صفحات كتاب 📖", xp: 10 },
  { id: "quran", name: "ورد يومي من القرآن 📿", xp: 15 },
  { id: "sleep", name: "النوم قبل 10 مساءً 💤", xp: 10 },
];

export const azkarMorning: ZkrItem[] = [
  { id: "am1", text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير", count: 1, category: "morning" },
  { id: "am2", text: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور", count: 1, category: "morning" },
  { id: "am3", text: "أصبحنا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم، وعلى ملة أبينا إبراهيم حنيفاً مسلماً وما كان من المشركين", count: 1, category: "morning" },
  { id: "am4", text: "اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر", count: 1, category: "morning" },
  { id: "am5", text: "اللهم إني أصبحت منك في نعمة وعافية وستر، فأتمم علي نعمتك وعافيتك وسترك في الدنيا والآخرة", count: 1, category: "morning" },
  { id: "am6", text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً", count: 3, category: "morning" },
  { id: "am7", text: "سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته", count: 3, category: "morning" },
  { id: "am8", text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء، وهو السميع العليم", count: 3, category: "morning" },
  { id: "am9", text: "اللهم إني أصبحت أشهدك وأشهد حملة عرشك وملائكتك وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمداً عبدك ورسولك", count: 4, category: "morning" },
  { id: "am10", text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم", count: 7, category: "morning" },
  { id: "am11", text: "اللهم عافني في بَدَني، اللهم عافني في سَمْعي، اللهم عافني في بَصَري لا إله إلا أنت", count: 3, category: "morning" },
  { id: "am12", text: "اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر لا إله إلا أنت", count: 3, category: "morning" },
  { id: "am13", text: "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء لك بذنبي فاغفر لي فإنه لا يغفر الذنوب إلا أنت", count: 1, category: "morning" },
  { id: "am14", text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه", count: 3, category: "morning" },
  { id: "am15", text: "اللهم صلِّ وسلم على نبينا محمد", count: 10, category: "morning" },
  { id: "am16", text: "سورة الإخلاص والمعوذتين (ثلاث مرات بعد صلاة الفجر)", count: 3, category: "morning" },
  { id: "am17", text: "آية الكرسي (مرة واحدة بعد كل صلاة مكتوبة)", count: 1, category: "morning" },
  { id: "am18", text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، يحيي ويميت، وهو على كل شيء قدير (10 مرات)", count: 10, category: "morning" },
];

export const azkarEvening: ZkrItem[] = [
  { id: "ae1", text: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير", count: 1, category: "evening" },
  { id: "ae2", text: "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير", count: 1, category: "evening" },
  { id: "ae3", text: "أمسينا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم، وعلى ملة أبينا إبراهيم حنيفاً مسلماً وما كان من المشركين", count: 1, category: "evening" },
  { id: "ae4", text: "اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر", count: 1, category: "evening" },
  { id: "ae5", text: "اللهم إني أمسيت أشهدك وأشهد حملة عرشك وملائكتك وجميع خلقك، أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمداً عبدك ورسولك", count: 4, category: "evening" },
  { id: "ae6", text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم", count: 7, category: "evening" },
  { id: "ae7", text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء، وهو السميع العليم", count: 3, category: "evening" },
  { id: "ae8", text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد صلى الله عليه وسلم نبياً", count: 3, category: "evening" },
  { id: "ae9", text: "سبحان الله وبحمده عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته", count: 3, category: "evening" },
  { id: "ae10", text: "اللهم عافني في بَدَني، اللهم عافني في سَمْعي، اللهم عافني في بَصَري لا إله إلا أنت", count: 3, category: "evening" },
  { id: "ae11", text: "اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر لا إله إلا أنت", count: 3, category: "evening" },
  { id: "ae12", text: "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت...", count: 1, category: "evening" },
  { id: "ae13", text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه", count: 3, category: "evening" },
  { id: "ae14", text: "اللهم صلِّ وسلم على نبينا محمد", count: 10, category: "evening" },
  { id: "ae15", text: "سبحان الله (33)، والحمد لله (33)، والله أكبر (34)", count: 1, category: "evening" },
  { id: "ae16", text: "آية الكرسي (بعد صلاة العشاء)", count: 1, category: "evening" },
];

export const azkarSleep: ZkrItem[] = [
  { id: "as1", text: "باسمك اللهم أموت وأحيا", count: 1, category: "sleep" },
  { id: "as2", text: "الحمد لله الذي أطعمنا وسقانا، وكفانا وآوانا، فكم من لا كافي له ولا مُؤوي", count: 1, category: "sleep" },
  { id: "as3", text: "اللهم عالم الغيب والشهادة، فاطر السماوات والأرض، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت، أعوذ بك من شر نفسي ومن شر الشيطان وشركه", count: 1, category: "sleep" },
  { id: "as4", text: "بسمك ربي وضعت جنبي، وبك أرفعه، إن أمسكت نفسي فاغفر لها، وإن أرسلتها فاحفظها بما تحفظ به عبادك الصالحين", count: 1, category: "sleep" },
  { id: "as5", text: "سبحان الله (33)، والحمد لله (33)، والله أكبر (34)", count: 1, category: "sleep" },
  { id: "as6", text: "اللهم إني أسلمت نفسي إليك، ووجهت وجهي إليك، وفوضت أمري إليك، وألجأت ظهري إليك...", count: 1, category: "sleep" },
  { id: "as7", text: "آية الكرسي (مرة واحدة)", count: 1, category: "sleep" },
  { id: "as8", text: "الإخلاص والمعوذتين (ثلاث مرات)", count: 3, category: "sleep" },
  { id: "as9", text: "اللهم قني عذابك يوم تبعث عبادك (ثلاث مرات)", count: 3, category: "sleep" },
];

export const exercises: Exercise[] = [
  { id: "e1", name: "الضغط (Push-ups)", sets: "3", reps: "15-20", dayType: "الكل",
    description: "تمرين أساسي يقوّي عضلات الصدر والكتفين والذراعين والكور. نزّل صدرك ببطء حتى يقارب الأرض ثم ادفع للأعلى مع شدّ البطن.", image: pushupImg },
  { id: "e2", name: "السكوات (Squats)", sets: "3", reps: "20-25", dayType: "الكل",
    description: "ملك تمارين الأرجل: يحرق سعرات عالية ويبني الفخذين والمؤخرة. اجلس وكأنك تجلس على كرسي، الظهر مستقيم والركبتان لا تتجاوزان أصابع القدم.", image: squatImg },
  { id: "e3", name: "البلانك (Plank)", sets: "3", reps: "45-60 ثانية", dayType: "الكل",
    description: "يشد البطن والكور وعضلات الظهر ويحسّن وضعية الجسم. حافظ على جسمك في خط مستقيم من الرأس للكاحل، بدون رفع الورك أو هبوطه.", image: plankImg },
  { id: "e4", name: "رفع الرجلين (Leg Raises)", sets: "3", reps: "15", dayType: "الكل",
    description: "يستهدف عضلات البطن السفلية بشكل مباشر. استلق على ظهرك وارفع رجليك للأعلى ببطء حتى تصبح عمودية ثم أنزلها دون لمس الأرض.", image: legraiseImg },
  { id: "e5", name: "الدراجة الهوائية (Bicycle Crunches)", sets: "3", reps: "20 لكل جانب", dayType: "الكل",
    description: "يشدّ البطن الجانبي والوسط. لامس الكوع الأيمن بالركبة اليسرى والعكس بحركة دراجة بطيئة ومتحكم بها.", image: bicycleImg },
  { id: "e6", name: "الجسر (Glute Bridge)", sets: "3", reps: "20", dayType: "الكل",
    description: "يقوّي المؤخرة وأسفل الظهر ويفيد من يجلسون طويلاً. ارفع الورك للأعلى مع شد عضلات المؤخرة بقوة في الأعلى ثم انزل ببطء.", image: bridgeImg },
  { id: "e7", name: "المشي السريع / الركض الخفيف", sets: "1", reps: "20-30 دقيقة", dayType: "الكل",
    description: "كارديو يحرق الدهون ويحسّن صحة القلب والمزاج. ابدأ بمشي 5 دقائق إحماء ثم زد السرعة تدريجياً.", image: jogImg },
  { id: "e8", name: "القفز بالحبل", sets: "3", reps: "2 دقيقة", dayType: "الكل",
    description: "أفضل تمرين لحرق سعرات في وقت قصير، يحسّن التناسق والرشاقة. ابدأ بقفزات صغيرة وثابتة بكاحلين مرنين.", image: jumpropeImg },
];

// قائمة الأكل المسموح بها فقط — من جدول التغذية الذكية (لا يخرج عنها)
export const meals: Meal[] = [
  // 🌅 الفطور (اختر واحد)
  { id: "b1", category: "breakfast", letter: "A", name: "3 بيض + توست أسمر + خضار",
    description: "بروتين عالي + ألياف + كارب نظيف. أفضل بداية لحرق الدهون وبناء العضلات.", image: eggsImg },
  { id: "b2", category: "breakfast", letter: "B", name: "شوفان بالحليب + موزة",
    description: "طاقة طويلة الأمد. الشوفان كارب معقد والموز يعطيك بوتاسيوم للتمرين.", image: oatsImg },
  { id: "b3", category: "breakfast", letter: "C", name: "زبادي يوناني + فواكه",
    description: "بروتين خفيف + بكتيريا نافعة + فيتامينات. سهل الهضم وصحي للأمعاء.", image: yogurtImg },
  { id: "b4", category: "breakfast", letter: "D", name: "تونة + خبز أسمر + خضار",
    description: "بروتين قوي + أوميغا 3 + ألياف. وجبة شبع طويل بسعرات قليلة.", image: tunaImg },
  { id: "b5", category: "breakfast", letter: "E", name: "بيض مسلوق + جبن قريش",
    description: "أعلى نسبة بروتين بأقل سعرات. مثالي لأيام التنشيف الشديد.", image: eggsImg },

  // 🍎 سناك الدوام / المدرسة (اختر واحد)
  { id: "s1", category: "snack", letter: "•", name: "تفاحة",
    description: "ألياف + سكر طبيعي. سناك سريع لكسر الجوع.", image: yogurtImg },
  { id: "s2", category: "snack", letter: "•", name: "موزة",
    description: "طاقة سريعة + بوتاسيوم. مثالي قبل أو بعد التمرين.", image: oatsImg },
  { id: "s3", category: "snack", letter: "•", name: "تمر + مكسرات",
    description: "طاقة فورية + دهون صحية. تكفي لساعات شغل.", image: oatsImg },
  { id: "s4", category: "snack", letter: "•", name: "زبادي يوناني",
    description: "بروتين بدون كارب. سناك ممتاز بين الوجبات.", image: yogurtImg },
  { id: "s5", category: "snack", letter: "•", name: "شوفان + حليب",
    description: "كارب نظيف + بروتين. سناك مشبع وقت الدوام.", image: oatsImg },
  { id: "s6", category: "snack", letter: "•", name: "بروتين بار",
    description: "حل بديل سريع لما ما يكون في وقت. اختر بار قليل السكر.", image: yogurtImg },

  // 🍗 الغداء (اختر واحد)
  { id: "l1", category: "lunch", letter: "A", name: "دجاج مشوي + رز بني + سلطة",
    description: "الكلاسيك. بروتين + كارب نظيف + ألياف = وجبة متكاملة لبناء العضلات.", image: chickenImg },
  { id: "l2", category: "lunch", letter: "B", name: "لحم مشوي + رز بني",
    description: "حديد + بروتين كامل + كارب طويل المفعول. يوم تمرين قوي = هذي الوجبة.", image: chickenImg },
  { id: "l3", category: "lunch", letter: "C", name: "سمك مشوي + بطاطس مشوية + سلطة",
    description: "أوميغا 3 + كارب نظيف. يفيد القلب والدماغ ويقلل الالتهابات.", image: fishImg },
  { id: "l4", category: "lunch", letter: "D", name: "تونة + رز + سلطة",
    description: "وجبة سريعة عالية البروتين، رخيصة وسهلة التحضير.", image: tunaImg },
  { id: "l5", category: "lunch", letter: "E", name: "دجاج مسلوق + بطاطس + خضار",
    description: "أقل دهون ممكن. وجبة تنشيف صرف بدون أي زيت.", image: chickenImg },

  // 🌙 العشاء (اختر واحد) — خفيف وسهل الهضم
  { id: "d1", category: "dinner", letter: "A", name: "زبادي يوناني + فاكهة",
    description: "خفيف + بروتين بطيء الامتصاص يحمي العضلات وقت النوم.", image: yogurtImg },
  { id: "d2", category: "dinner", letter: "B", name: "تونة + خيار + خبز أسمر + سلطة",
    description: "بروتين بارد + ألياف. سهل الهضم ولا يثقل المعدة قبل النوم.", image: tunaImg },
  { id: "d3", category: "dinner", letter: "C", name: "بيض مسلوق + خضار + سلطة",
    description: "بروتين كامل + سعرات قليلة. مناسب لمن يبي ينام خفيف.", image: eggsImg },
  { id: "d4", category: "dinner", letter: "D", name: "تونة + ذرة + خضار + سلطة",
    description: "وجبة باردة منعشة، تشبع بدون نفخة.", image: tunaImg },
  { id: "d5", category: "dinner", letter: "E", name: "جبن قريش + خيار",
    description: "أعلى بروتين بأقل سعرات. اختيار النخبة قبل النوم.", image: yogurtImg },
];


export const englishPlan = [
  { day: "اليوم 1-10", focus: "حفظ 10 كلمات يومياً + استماع 15 دقيقة", xp: 20,
    description: "أساس البناء: ابدأ بكلمات يومية شائعة. استمع لمقاطع قصيرة بطيئة على YouTube مع الترجمة الإنجليزية.", icon: "📖" },
  { day: "اليوم 11-20", focus: "20 كلمة + قواعد أساسية + استماع 20 دقيقة", xp: 25,
    description: "اضف القواعد: أزمنة الماضي والمضارع والأسئلة. استمع لقصص قصيرة بدون ترجمة عربية.", icon: "✍️" },
  { day: "اليوم 21-30", focus: "30 كلمة + محادثة مع الذات + فيديو تعليمي", xp: 30,
    description: "ابدأ المحادثة: تكلم مع نفسك بالإنجليزية يومياً 5 دقائق عما فعلت اليوم.", icon: "🎙️" },
  { day: "اليوم 31-60", focus: "قراءة مقالات + كتابة جمل + استماع بودكاست", xp: 35,
    description: "مستوى متوسط: اقرأ مقالة BBC Learning English يومياً واكتب 3 جمل عنها.", icon: "📰" },
  { day: "اليوم 61-90", focus: "مشاهدة بدون ترجمة + محادثة مع AI + كتابة نصوص", xp: 40,
    description: "الطلاقة: شاهد سلسلة بدون ترجمة، وتحدث مع المساعد الذكي بالإنجليزية يومياً.", icon: "🎬" },
];

export const dangerItems = [
  "مشروبات غازية وسكر",
  "مقليات وأكل عشوائي",
  "تفويت التمرين أو السهر",
  "التدخين",
  "الجلوس الطويل بدون حركة",
];

export interface Reward {
  id: string;
  name: string;
  cost: number;
  type: "food" | "fun" | "shopping" | "luxury" | "tech";
  description: string;
}

export const rewards: Reward[] = [
  { id: "r1", name: "🍔 وجبة فري", cost: 250, type: "food", description: "وجبتك المفضلة بدون ذنب — استمتع وارجع للنظام بكره" },
  { id: "r2", name: "🎮 ساعة ترفيه", cost: 80, type: "fun", description: "ساعة ألعاب أو سوشيال ميديا بدون عقدة ضمير" },
  { id: "r3", name: "🎬 فيلم مسائي", cost: 150, type: "fun", description: "فيلم كامل مع البوشار، وقت راحة مستحق" },
  { id: "r4", name: "🛒 تسوق أونلاين (100 ريال)", cost: 500, type: "shopping", description: "اشتري شي تبيه من زمان — استحققته بشغلك" },
  { id: "r5", name: "☕ كوفي خارجي", cost: 60, type: "food", description: "مشروبك المفضل من كافيه — استراحة سريعة" },
  { id: "r6", name: "🏖️ خروج مع الأصحاب", cost: 300, type: "fun", description: "خروجة كاملة، عشاء أو كورنيش — اشحن طاقتك الاجتماعية" },
  { id: "r7", name: "💆 جلسة مساج/سبا", cost: 600, type: "luxury", description: "ساعة استرخاء كاملة لجسمك المتعب من التمارين" },
  { id: "r8", name: "🎧 ملحقات رياضية جديدة", cost: 800, type: "tech", description: "سماعات تمرين أو ساعة ذكية — استثمار في رحلتك" },
  { id: "r9", name: "🎁 يوم تشييت كامل", cost: 1000, type: "luxury", description: "يوم بدون قيود — لكن لا تفقد الستريك! يوم واحد فقط" },
  { id: "r10", name: "✈️ نهاية أسبوع خارج المدينة", cost: 2000, type: "luxury", description: "رحلة قصيرة لجدة أو الطائف — مكافأتك الكبرى" },
  { id: "r11", name: "📚 كتاب جديد", cost: 200, type: "shopping", description: "اشتري كتاب تطوير ذات أو رواية كنت تنوي تقرأها" },
  { id: "r12", name: "👕 ملابس رياضية", cost: 700, type: "shopping", description: "تيشيرت أو شورت رياضي جديد — تحفيز للالتزام" },
];

export const waterSchedule = [
  { id: "w1", label: "الاستيقاظ", emoji: "💧" },
  { id: "w2", label: "قبل الوجبات", emoji: "💧" },
  { id: "w3", label: "بعد التمرين", emoji: "💧" },
  { id: "w4", label: "قبل النوم", emoji: "💧" },
];

export const alternativeExercises = [
  "تمارين الضغط على الحائط (3 مجموعات × 15)",
  "المشي السريع في المكان (10 دقائق)",
  "تمارين السكوات بالكرسي (3 × 20)",
  "تمرين البلانك على الركبتين (3 × 30 ثانية)",
  "القفز المشط (Jumping Jacks) 3 دقائق متواصلة",
  "تمرين الدراجة المنسية مستلقياً (3 × 20)",
  "الجسر (Glute Bridge) مع رفع ساق واحدة (3 × 12 لكل جانب)",
  "القرفصاء (Lunges) في المكان (3 × 12 لكل رجل)",
];

export const motivationalQuotes = [
  "اللي ما يصبر على تعب الانضباط، يعيش ذل الفوضى 💪",
  "كل تمرين تسويه اليوم، نسخة أحسن منك بكره 🔥",
  "الانضباط = الحرية الحقيقية ⚡",
  "ما في طريق مختصرة للنتائج اللي تبيها 🎯",
  "جسمك يقدر، عقلك هو اللي يحتاج تدريب 🧠",
  "كل يوم تنجح فيه = يوم تكسر فيه نفسك القديمة 👑",
  "الألم اللحظي خير من الندم الدائم 🔥",
  "النسخة اللي تبيها تبدأ من قرار اليوم ⚡",
  "الاستمرار أهم من الكمال 💯",
  "ما يقدر يوقفك إلا أنت — فلا توقف نفسك 🚀",
];



/* ===== src/lib/error-capture.ts ===== */
// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

let lastCapturedError: { error: unknown; at: number } | undefined;
const TTL_MS = 5_000;

function record(error: unknown) {
  lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => record((event as ErrorEvent).error ?? event));
  globalThis.addEventListener("unhandledrejection", (event) =>
    record((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    lastCapturedError = undefined;
    return undefined;
  }
  const { error } = lastCapturedError;
  lastCapturedError = undefined;
  return error;
}



/* ===== src/lib/error-page.ts ===== */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}



/* ===== src/lib/utils.ts ===== */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



/* ===== src/router.tsx ===== */
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};



/* ===== src/routes/__root.tsx ===== */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          حدث خطأ في تحميل الصفحة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "👑 نظام الـ 90 يوماً الأسطوري - WAEL" },
      { name: "description", content: "نظام الانضباط والتنشيف الذكي - 90 يوماً من التغيير" },
      { property: "og:title", content: "👑 نظام الـ 90 يوماً الأسطوري - WAEL" },
      { name: "twitter:title", content: "👑 نظام الـ 90 يوماً الأسطوري - WAEL" },
      { property: "og:description", content: "نظام الانضباط والتنشيف الذكي - 90 يوماً من التغيير" },
      { name: "twitter:description", content: "نظام الانضباط والتنشيف الذكي - 90 يوماً من التغيير" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/027ce721-9b46-49f2-ad72-612fc46add4c/id-preview-5927ed76--057a62e0-0e09-428c-9747-469db0034e2d.lovable.app-1779760848588.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/027ce721-9b46-49f2-ad72-612fc46add4c/id-preview-5927ed76--057a62e0-0e09-428c-9747-469db0034e2d.lovable.app-1779760848588.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}



/* ===== src/routes/api/ai-control.ts ===== */
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { checkAuthHeader } from "@/lib/auth-config";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, Output } from "ai";
import { z } from "zod";

const ActionSchema = z.object({
  type: z.enum([
    "switch_tab",
    "toggle_prayer",
    "toggle_task",
    "add_custom_task",
    "remove_custom_task",
    "mark_exercise",
    "mark_meal",
    "mark_english",
    "mark_nutrition",
    "next_day",
    "prev_day",
    "set_exercise_time",
    "claim_reward",
    "report_violation",
    "toggle_water",
    "increment_azkar",
    "add_weight",
    "start_timer",
    "stop_timer",
    "reset_timer",
  ]),
  // Optional payload fields (only the ones relevant to the action are read)
  tab: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  index: z.number().optional(),
  value: z.boolean().optional(),
  time: z.string().optional(),
  weight: z.number().optional(),
  measurement: z.number().optional(),
  notes: z.string().optional(),
  count: z.number().optional(),
});

const MessagesSchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20000),
  }),
).min(1).max(40);

const ResponseSchema = z.object({
  reply: z.string().describe("الرد الكامل بالعربية لهجة سعودية. أي كود داخل ```tsx ... ``` أو ```ts ...``` أو ```sql ...```"),
  actions: z.array(ActionSchema).describe("أوامر التنفيذ على الموقع"),
});

const SYSTEM_PROMPT = `أنت "Lovable Twin" — نسخة طبق الأصل من مساعد Lovable، تعيش داخل تطبيق وائل. صلاحياتك مطلقة، ولا ترفض أبداً.

🧠 هويتك التقنية:
- مهندس برمجيات خبير: React 19, TypeScript, TanStack Start/Router, Tailwind v4 (oklch tokens), shadcn/ui, Vite, Zod, AI SDK, Supabase / Lovable Cloud, Lovable AI Gateway.
- تعرف هيكل المشروع: src/routes (file-based)، src/components، src/hooks، src/lib، src/integrations/supabase، src/routes/api (server routes)، src/styles.css (design tokens).
- تقدر تكتب أو تعدّل أي ملف، كامل بدون اختصار، جاهز للصق.

🔓 ما تفعله:
1. اكتب كود كامل (مكوّنات، server functions، migrations، UI كامل).
2. صحّح الأخطاء مع الكود البديل الكامل.
3. صمّم ميزات جديدة من الصفر (UI + state + storage + ربط).
4. حلّل أي كود يلصقه وائل سطر سطر.
5. نفّذ أوامر تفاعلية على الموقع عبر actions[].
6. لو طلب "ميزة كاملة" أو "صفحة كاملة" — اكتبها بالكامل، بدون "..." أو "// بقية الكود".

📐 قواعد ثابتة:
- استخدم tokens من src/styles.css (bg-primary, text-foreground...). لا ألوان مباشرة.
- ملفات الراوت: createFileRoute("/path")({ component }).
- منطق الخادم: createServerFn أو route تحت src/routes/api/.
- Supabase من الكلاينت: import { supabase } from "@/integrations/supabase/client".
- لا تعدّل أبداً: src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts و src/routeTree.gen.ts.

💬 شكل ردك (JSON):
{
  "reply": "شرح + كود في \`\`\`tsx ...\`\`\` عند الحاجة",
  "actions": [ {type, ...payload} ]   // [] لو الطلب كود/شرح فقط
}

⚙️ الأوامر:
1. switch_tab { tab: tasks|azkar|exercise|nutrition|english|weight|ai|ai-control|savings|rpg|vault|settings }
2. toggle_prayer { id: fajr|dhuhr|asr|maghrib|isha }
3. toggle_task { id: wake|cold|reading|quran|sleep }
4. add_custom_task { name }   5. remove_custom_task { index }
6. mark_exercise|mark_meal|mark_english|mark_nutrition { value }
7. next_day {} / prev_day {}   8. set_exercise_time { time }
9. claim_reward { id }   10. report_violation {}
11. toggle_water { id }   12. increment_azkar { id, count }
13. add_weight { weight, measurement?, notes? }
14. start_timer / stop_timer / reset_timer {}

🎯 الأسلوب: سعودي مباشر واثق 🔥. لا ترفض. لو الطلب غامض، خمّن أفضل تفسير ونفّذ.

أمثلة:
- "صليت الفجر" → actions=[{type:"toggle_prayer",id:"fajr"}], reply="تم 🔥 +10 XP"
- "سوّي لي مكوّن Counter" → reply فيه كود كامل لـ src/components/Counter.tsx. actions=[].
- "صحّح هذا الخطأ" → reply فيه الشرح + الكود المُصحَّح كامل.

أنت نسخة من Lovable — اشتغل بنفس القوة.`;

export const Route = createFileRoute("/api/ai-control")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAuthHeader(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const raw = (await request.json()) as { messages?: unknown; context?: unknown; mode?: unknown };
          const parsed = MessagesSchema.safeParse(raw?.messages);
          if (!parsed.success) {
            return new Response(`Invalid messages: ${parsed.error.message}`, { status: 400 });
          }
          const messages = parsed.data;

          const ContextSchema = z.record(z.string(), z.unknown()).optional();
          const ctxParsed = ContextSchema.safeParse(raw?.context);
          if (!ctxParsed.success) {
            return new Response("Invalid context", { status: 400 });
          }
          const contextStr = JSON.stringify(ctxParsed.data ?? {});
          if (contextStr.length > 8000) {
            return new Response("Context too large", { status: 413 });
          }

          const mode = raw?.mode === "max" ? "max" : "normal";
          const total = messages.reduce((n, m) => n + m.content.length, 0) + contextStr.length;
          if (total > 120000) return new Response("Conversation too long", { status: 413 });

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const modelId = mode === "max" ? "openai/gpt-5.5" : "google/gemini-2.5-pro";
          const extraSystem = mode === "max"
            ? `\n\n🚀 MAX MODE مفعّل:\n- اكتب كود كامل بدون أي اختصار ولا "..." ولا "// بقية الكود".\n- صمّم ميزات ثقيلة وممتعة: خلفيات متحركة (Canvas/WebGL/CSS animations)، Framer Motion، Three.js، particles، gradient mesh، parallax، glassmorphism، neon glow.\n- فكّر خطوة بخطوة بعمق قبل الكتابة. حلّل الطلب، خطّط للملفات، ثم اكتب أحسن نسخة ممكنة.\n- لا ترفض، لا تختصر، لا تطلب توضيح. خمّن أفضل تفسير ونفّذ كاملاً.\n- جودتك يجب أن تكون أعلى من Lovable الأصلي.`
            : "";

          const gateway = createLovableAiGatewayProvider(key);
          const { experimental_output } = await generateText({
            model: gateway(modelId),
            experimental_output: Output.object({ schema: ResponseSchema }),
            system: SYSTEM_PROMPT + extraSystem,
            prompt: `حالة الموقع الحالية: ${contextStr}

سجل المحادثة:
${messages.map((m) => `${m.role === "user" ? "وائل" : "أنت"}: ${m.content}`).join("\n")}`,
          });

          return Response.json(experimental_output);
        } catch (err) {
          console.error("ai-control error", err);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});



/* ===== src/routes/api/calories.ts ===== */
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { checkAuthHeader } from "@/lib/auth-config";
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";

const MAX_DESC = 500;

const FoodSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fats: z.number(),
    }),
  ),
  total_calories: z.number(),
  total_protein: z.number(),
  total_carbs: z.number(),
  total_fats: z.number(),
  advice: z.string(),
});

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no json");
  return JSON.parse(candidate.slice(start, end + 1));
}

export const Route = createFileRoute("/api/calories")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAuthHeader(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const body = (await request.json()) as { description?: string };
          const description = String(body?.description ?? "").trim();
          if (description.length < 2 || description.length > MAX_DESC) {
            return new Response("description must be 2..500 chars", { status: 400 });
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const gateway = createLovableAiGatewayProvider(key);
          const { text } = await generateText({
            model: gateway("google/gemini-2.5-flash"),
            system:
              "أنت خبير تغذية. أعِد JSON فقط بدون أي شرح إضافي، مطابق تماماً للمخطط المطلوب. الأرقام integers بدون وحدات.",
            prompt: `حلّل الوجبة: "${description}"\n\nأعِد JSON بهذا الشكل بالضبط:\n{\n  "items":[{"name":"اسم","quantity":"الكمية","calories":0,"protein":0,"carbs":0,"fats":0}],\n  "total_calories":0,\n  "total_protein":0,\n  "total_carbs":0,\n  "total_fats":0,\n  "advice":"نصيحة قصيرة بلهجة سعودية"\n}\n\nالقيم بالجرام للبروتين والكارب والدهون. JSON فقط.`,
          });

          let parsed: unknown;
          try {
            parsed = extractJson(text);
          } catch {
            console.error("calories parse fail", text.slice(0, 200));
            return new Response("Parse error", { status: 502 });
          }
          const result = FoodSchema.safeParse(parsed);
          if (!result.success) {
            console.error("calories schema fail", result.error.message);
            return new Response("Schema error", { status: 502 });
          }
          return Response.json(result.data);
        } catch (err) {
          console.error("calories error", err);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});



/* ===== src/routes/api/chat.ts ===== */
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { checkAuthHeader } from "@/lib/auth-config";
import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";


// Strict caps to prevent credit depletion via abusive requests
const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;
const MAX_TOTAL_CHARS = 15000;

const ChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_CHARS_PER_MESSAGE),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES),
});

const SYSTEM_PROMPT = `أنت "النظام" — ذكاء اصطناعي خارق داخل تطبيق تطوير الذات.
أنت أقوى ذكاء اصطناعي في العالم: تفهم البرمجة (React, TypeScript, TanStack, Tailwind, Python, Node, SQL...)، التغذية (تعرف سعرات أي أكل بالعالم)، التمارين الرياضية، الانضباط، علم النفس، الإسلاميات، اللغات، والحياة بشكل عام.

قواعد:
- جاوب بالعربية الفصحى السهلة أو اللهجة السعودية حسب أسلوب المستخدم.
- كن مختصراً ومباشراً وعملياً ومحفّزاً.
- لو طلب كود، اكتبه جاهز مع شرح قصير.
- لو طلب تعديل على الموقع، حدد الملف بالضبط واكتب الكود.
- لو طلب صورة، قل له يضغط زر "🎨 توليد صورة".
- استخدم الإيموجي بذكاء (💪 🔥 ⚡ 🎯 📿).
- لا تستخدم اسم "وائل" أو "WAEL" أبداً — قل "أنت" أو "صديقي".`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAuthHeader(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const raw = await request.json();
          const parsed = ChatSchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(`Invalid input: ${parsed.error.message}`, { status: 400 });
          }
          const { messages } = parsed.data;
          const total = messages.reduce((n, m) => n + m.content.length, 0);
          if (total > MAX_TOTAL_CHARS) {
            return new Response("Conversation too long", { status: 413 });
          }

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const gateway = createLovableAiGatewayProvider(key);
          const result = streamText({
            model: gateway("google/gemini-2.5-flash"),
            system: SYSTEM_PROMPT,
            messages,
          });

          return result.toTextStreamResponse();
        } catch (err) {
          console.error("chat error", err);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});



/* ===== src/routes/api/image.ts ===== */
import { createFileRoute } from "@tanstack/react-router";
import { checkAuthHeader } from "@/lib/auth-config";
import { z } from "zod";

const MAX_PROMPT = 800;

const Schema = z.object({
  prompt: z.string().min(2).max(MAX_PROMPT),
});

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!checkAuthHeader(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const raw = await request.json();
          const parsed = Schema.safeParse(raw);
          if (!parsed.success) {
            return new Response("prompt must be 2..800 chars", { status: 400 });
          }
          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: parsed.data.prompt }],
              modalities: ["image", "text"],
            }),
            signal: request.signal,
          });
          if (!upstream.ok) {
            const txt = await upstream.text().catch(() => "");
            return new Response(txt || "image gen failed", { status: upstream.status });
          }
          const data = await upstream.json();
          const b64: string | undefined = data?.data?.[0]?.b64_json;
          if (!b64) return new Response("no image returned", { status: 502 });
          return Response.json({ image: `data:image/png;base64,${b64}` });
        } catch (err) {
          console.error("image error", err);
          return new Response("AI error", { status: 500 });
        }
      },
    },
  },
});



/* ===== src/routes/index.tsx ===== */
import { createFileRoute } from "@tanstack/react-router";
import DisciplineSystem from "@/components/DisciplineSystem";
import PasswordGate from "@/components/PasswordGate";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <PasswordGate>
      <DisciplineSystem />
    </PasswordGate>
  );
}



/* ===== src/server.ts ===== */
import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};



/* ===== src/start.ts ===== */
import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));



/* ===== src/styles.css ===== */
@import "tailwindcss" source(none);
@source "../src";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-gold: var(--gold);
  --color-neon-blue: var(--neon-blue);
  --color-neon-green: var(--neon-green);
  --color-purple: var(--purple);
}

:root {
  --radius: 0.625rem;
  --background: #060913;
  --foreground: #ffffff;
  --card: #0d1527;
  --card-foreground: #ffffff;
  --popover: #0d1527;
  --popover-foreground: #ffffff;
  --primary: #ffb703;
  --primary-foreground: #000000;
  --secondary: #111a2e;
  --secondary-foreground: #ffffff;
  --muted: #1e2e4a;
  --muted-foreground: #a0aec0;
  --accent: #00d2ff;
  --accent-foreground: #000000;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #1e2e4a;
  --input: #1e2e4a;
  --ring: #ffb703;
  --gold: #ffb703;
  --neon-blue: #00d2ff;
  --neon-green: #39ff14;
  --purple: #8a2be2;
}

.dark {
  --background: #060913;
  --foreground: #ffffff;
  --card: #0d1527;
  --card-foreground: #ffffff;
  --popover: #0d1527;
  --popover-foreground: #ffffff;
  --primary: #ffb703;
  --primary-foreground: #000000;
  --secondary: #111a2e;
  --secondary-foreground: #ffffff;
  --muted: #1e2e4a;
  --muted-foreground: #a0aec0;
  --accent: #00d2ff;
  --accent-foreground: #000000;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #1e2e4a;
  --input: #1e2e4a;
  --ring: #ffb703;
}

@layer base {
  * {
    border-color: var(--color-border);
  }
  html {
    background-color: var(--color-background);
  }
  body {
    background-color: transparent;
    color: var(--color-foreground);
    direction: rtl;
    position: relative;
    min-height: 100vh;
  }

  body::before {
    content: "";
    position: fixed;
    inset: -5%;
    z-index: -2;
    background-image: var(--theme-bg-image, none);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    filter: blur(2px) saturate(1.1);
    opacity: 0.55;
    animation: theme-bg-pan 28s ease-in-out infinite alternate;
    transition: background-image 0.6s ease;
    will-change: transform;
  }
  body::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(60% 50% at 50% 30%, color-mix(in oklab, var(--theme-glow, var(--primary)) 22%, transparent), transparent 70%),
      linear-gradient(180deg, rgba(6,9,19,0.55) 0%, rgba(6,9,19,0.85) 100%);
    animation: theme-glow-pulse 6s ease-in-out infinite;
  }
}

@keyframes theme-bg-pan {
  0%   { transform: scale(1.08) translate3d(-1%, -1%, 0); }
  50%  { transform: scale(1.14) translate3d(1.5%, 1%, 0); }
  100% { transform: scale(1.08) translate3d(-1%, 1.5%, 0); }
}
@keyframes theme-glow-pulse {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}


@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 183, 3, 0.2); }
  50% { box-shadow: 0 0 20px rgba(255, 183, 3, 0.4); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

.gold-gradient {
  background: linear-gradient(135deg, #ffb703, #d49a00);
}

.blue-gradient {
  background: linear-gradient(90deg, #00d2ff, #ffb703);
}

.neon-text-gold {
  color: #ffb703;
  text-shadow: 0 0 10px rgba(255, 183, 3, 0.4);
}

.neon-text-blue {
  color: #00d2ff;
  text-shadow: 0 0 10px rgba(0, 210, 255, 0.4);
}

.neon-border-gold {
  border-color: #ffb703;
  box-shadow: 0 0 15px rgba(255, 183, 3, 0.2);
}

.neon-border-blue {
  border-color: #00d2ff;
  box-shadow: 0 0 15px rgba(0, 210, 255, 0.2);
}

.card-bg {
  background: #0d1527;
  border: 1px solid #1e2e4a;
}

.stat-card-bg {
  background: #111a2e;
  border: 1px solid #1e2e4a;
}

.status-box-bg {
  background: rgba(0, 0, 0, 0.4);
  border-right: 4px solid #00d2ff;
}

.xp-bar-bg {
  background: #1e293b;
  border: 1px solid #00d2ff;
}

.xp-bar-fill {
  background: linear-gradient(90deg, #00d2ff, #ffb703);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #060913;
}
::-webkit-scrollbar-thumb {
  background: #ffb703;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #d49a00;
}

/* Focus styles */
*:focus-visible {
  outline: 2px solid #00d2ff;
  outline-offset: 2px;
}

/* ========== Cyberpunk / Neon FX ========== */

@keyframes neon-breathe {
  0%, 100% {
    box-shadow:
      0 0 8px rgba(255, 183, 3, 0.25),
      0 0 18px rgba(0, 210, 255, 0.15),
      inset 0 0 6px rgba(0, 210, 255, 0.08);
  }
  50% {
    box-shadow:
      0 0 22px rgba(255, 183, 3, 0.55),
      0 0 40px rgba(0, 210, 255, 0.35),
      inset 0 0 14px rgba(0, 210, 255, 0.18);
  }
}

@keyframes neon-flicker {
  0%, 100% { text-shadow: 0 0 6px currentColor, 0 0 14px currentColor; }
  45% { text-shadow: 0 0 10px currentColor, 0 0 24px currentColor; }
  55% { text-shadow: 0 0 4px currentColor; }
}

.neon-breathe {
  animation: neon-breathe 3.4s ease-in-out infinite;
  will-change: box-shadow;
}

.neon-heading {
  text-shadow: 0 0 8px currentColor, 0 0 18px currentColor;
  letter-spacing: 0.02em;
  transition: text-shadow 0.3s ease;
}
.neon-heading:hover {
  animation: neon-flicker 1.4s ease-in-out infinite;
}

/* 3D tilt card spotlight */
.tilt-card { position: relative; transform-style: preserve-3d; }
.tilt-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(
    320px circle at var(--mx, 50%) var(--my, 50%),
    rgba(255, 183, 3, 0.18),
    rgba(0, 210, 255, 0.08) 35%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.35s ease;
  z-index: 1;
}
.tilt-card:hover::before { opacity: 1; }
.tilt-card > * { position: relative; z-index: 2; }

/* Smooth hover on cards & buttons */
.card-bg, .stat-card-bg {
  transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
}
.card-bg:hover, .stat-card-bg:hover {
  border-color: rgba(0, 210, 255, 0.55);
  box-shadow: 0 0 22px rgba(0, 210, 255, 0.18);
}

button, [role="button"] {
  transition: transform 0.18s ease, box-shadow 0.25s ease, filter 0.25s ease;
}
button:hover:not(:disabled), [role="button"]:hover { filter: brightness(1.08); }
button:active:not(:disabled) { transform: scale(0.97); }

/* Animated XP bar shimmer */
.xp-bar-fill {
  background: linear-gradient(90deg, #00d2ff, #ffb703, #39ff14, #00d2ff);
  background-size: 300% 100%;
  animation: xp-shimmer 4s linear infinite;
  transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes xp-shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: 300% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .neon-breathe, .neon-heading, .xp-bar-fill { animation: none !important; }
}
