
import { GoogleGenAI } from "@google/genai";
import { Task, User, Language } from './types.ts';
import { toLocalDateString } from './utils.ts';

// 获取 API Key 并增加垫片保护
const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

const ai = new GoogleGenAI({ apiKey });
const MODEL_NAME = 'gemini-2.5-flash';

export interface ExecutiveReport {
    title: string;
    date: string;
    overallStats: {
        total: number;
        completed: number;
        overdue: number;
        pending: number;
        completionRate: number;
    };
    categoryStats: {
        name: string;
        total: number;
        completed: number;
        rate: number;
    }[];
    personalStats: {
        name: string;
        total: number;
        completed: number;
        overdue: number;
        rate: number;
    }[];
    anomalyAnalysis: string;
    redList: { name: string; reason: string }[];
    blackList: { name: string; reason: string }[];
    teamConclusion: string;
}

export const getAnomalyAnalysis = async (tasks: Task[], users: User[], language: Language): Promise<string> => {
    if (!apiKey) return language === 'zh' ? "AI 功能未配置 API Key。" : "AI features require API Key.";
    
    const today = toLocalDateString(new Date());
    const totalOverdue = tasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
    const riskyPersonnel = users.map(u => {
      const userTasks = tasks.filter(t => t.employeeId === u.employeeId);
      const overdueTasks = userTasks.filter(t => t.status !== 'completed' && t.endDate < today);
      return { name: u.name, count: overdueTasks.length };
    }).filter(u => u.count > 0).sort((a,b) => b.count - a.count).slice(0,3);

    const prompt = language === 'zh'
        ? `简述当前风险：逾期任务共${totalOverdue}个。重点提醒：${riskyPersonnel.map(p=>p.name).join(', ')}。100字以内。`
        : `Summary: ${totalOverdue} overdue. Alert: ${riskyPersonnel.map(p=>p.name).join(', ')}.`;

    try {
        const res = await ai.models.generateContent({ model: MODEL_NAME, contents: [{ text: prompt }] });
        return res.text || "";
    } catch { return ""; }
};

export const getEfficiencyAnalysis = async (userTasks: Task[], period: string, language: Language): Promise<string> => {
    if (!apiKey) return "";

     try {
        const completed = userTasks.filter(t => t.status === 'completed').length;
        const total = userTasks.length;
        const rate = total > 0 ? Math.round((completed/total)*100) : 0;
        const prompt = language === 'zh' 
            ? `分析效率：完成率${rate}%。一句话点评。`
            : `Analyze efficiency: ${rate}% done. One sentence.`;
        const res = await ai.models.generateContent({ model: MODEL_NAME, contents: [{ text: prompt }] });
        return res.text || "";
    } catch { return ""; }
};

export const generateExecutiveReport = async (tasks: Task[], users: User[], language: Language): Promise<ExecutiveReport | null> => {
    if (!apiKey) return null;

    try {
        const today = toLocalDateString(new Date());
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const overdue = tasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
        const pending = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const catMap = new Map<string, { total: number, completed: number }>();
        tasks.forEach(t => {
            const entry = catMap.get(t.category) || { total: 0, completed: 0 };
            entry.total++;
            if (t.status === 'completed') entry.completed++;
            catMap.set(t.category, entry);
        });
        const categoryStats = Array.from(catMap.entries()).map(([name, stats]) => ({
            name,
            total: stats.total,
            completed: stats.completed,
            rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
        })).sort((a, b) => b.total - a.total);

        const personalStats = users.filter(u => u.role !== 'admin').map(u => {
            const myTasks = tasks.filter(t => t.employeeId === u.employeeId);
            const myCompleted = myTasks.filter(t => t.status === 'completed').length;
            const myOverdue = myTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
            return {
                name: u.name,
                total: myTasks.length,
                completed: myCompleted,
                overdue: myOverdue,
                rate: myTasks.length > 0 ? Math.round((myCompleted / myTasks.length) * 100) : 0
            };
        }).sort((a, b) => b.rate - a.rate);

        const dataContext = { date: today, overall: { total, completed, overdue, rate: completionRate }, topCategories: categoryStats.slice(0, 5) };
        const systemPrompt = language === 'zh' ? "请生成JSON格式分析报告..." : "Generate JSON report...";

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [{ text: systemPrompt }, { text: `Data: ${JSON.stringify(dataContext)}` }],
            config: { responseMimeType: "application/json" }
        });

        if (response.text) {
            const aiData = JSON.parse(response.text);
            return {
                title: language === 'zh' ? '团队协作日报' : 'Team Report',
                date: today,
                overallStats: { total, completed, overdue, pending, completionRate },
                categoryStats,
                personalStats,
                anomalyAnalysis: aiData.anomalyAnalysis,
                redList: aiData.redList || [],
                blackList: aiData.blackList || [],
                teamConclusion: aiData.teamConclusion
            };
        }
        return null;
    } catch { return null; }
};
