
import { GoogleGenAI } from "@google/genai";
import { Task, User, Language } from './types';
import { toLocalDateString } from './utils';

// Initialize the client
// process.env.API_KEY is assumed to be injected by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const getAnomalyAnalysis = async (
  tasks: Task[], 
  users: User[], 
  language: Language
): Promise<string> => {
  try {
    const today = toLocalDateString(new Date());
    
    // 1. Macro Analysis Data (Overall Trends)
    const totalOverdue = tasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
    const totalAbnormal = tasks.filter(t => (t.modificationCount || 0) > 3).length;

    // 2. Personnel Analysis Data (Specific Risks for Callouts)
    const riskyPersonnel = users.map(u => {
      const userTasks = tasks.filter(t => t.employeeId === u.employeeId);
      
      const overdueTasks = userTasks
        .filter(t => t.status !== 'completed' && t.endDate < today)
        .map(t => t.title); 
        
      const abnormalTasks = userTasks
        .filter(t => (t.modificationCount || 0) > 3)
        .map(t => t.title);

      return {
        name: u.name,
        overdueCount: overdueTasks.length,
        abnormalCount: abnormalTasks.length,
        // Limit sample titles to 2 per category for concise reporting
        overdueSamples: overdueTasks.slice(0, 2),
        abnormalSamples: abnormalTasks.slice(0, 2)
      };
    })
    .filter(u => u.overdueCount > 0 || u.abnormalCount > 0)
    // Sort by severity (most issues first)
    .sort((a, b) => (b.overdueCount + b.abnormalCount) - (a.overdueCount + a.abnormalCount))
    // Take top 3 for the report to avoid overwhelming the text
    .slice(0, 3);

    const promptContext = JSON.stringify({
      overview: { totalOverdue, totalAbnormal },
      topRisks: riskyPersonnel
    });

    const langPrompt = language === 'zh' 
      ? "作为项目经理，请为团队大屏生成一段‘异常分析日报’。1. 首先简述整体风险趋势（如逾期总量）。2. 然后重点对1-3名有突出问题的人员进行具体任务的点名提醒或警告。语气需专业、严肃，具有警示作用，因为这段分析将公开展示给所有人员。限制在120字以内。" 
      : "As a project manager, generate a short 'Anomaly Analysis' for the team dashboard report. 1. Briefly summarize the overall risk trend (e.g., total overdue). 2. Specifically warn/remind 1-3 high-risk personnel about their specific problematic tasks. The tone should be professional and alert, suitable for public display. Keep under 100 words.";

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { text: langPrompt },
        { text: `Project Data: ${promptContext}` }
      ]
    });

    return response.text || (language === 'zh' ? "无法生成分析。" : "Could not generate analysis.");
  } catch (error) {
    console.error("Gemini Anomaly Analysis Failed:", error);
    return language === 'zh' ? "AI分析服务暂时不可用。" : "AI analysis service temporarily unavailable.";
  }
};

export const getEfficiencyAnalysis = async (
  userTasks: Task[],
  period: string,
  language: Language
): Promise<string> => {
  try {
    const today = toLocalDateString(new Date());
    
    // Categorize tasks to provide specific insights
    const completedTasks = userTasks.filter(t => t.status === 'completed');
    const overdueTasks = userTasks.filter(t => t.status === 'pending' && t.endDate < today);
    const pendingTasks = userTasks.filter(t => t.status === 'pending' && t.endDate >= today);
    
    const total = userTasks.length;
    const completionRate = total > 0 ? Math.round((completedTasks.length / total) * 100) : 0;

    const summary = {
        periodView: period,
        completionRate: `${completionRate}%`,
        totalCompleted: completedTasks.length,
        totalOverdue: overdueTasks.length,
        totalPending: pendingTasks.length,
        // Send a few specific titles for personalized advice
        overdueTitles: overdueTasks.slice(0, 3).map(t => t.title),
        pendingTitles: pendingTasks.slice(0, 3).map(t => t.title)
    };
    
    const promptContext = JSON.stringify(summary);
    
    const langPrompt = language === 'zh' 
      ? "作为职业教练，根据用户的全部任务数据（含逾期、待办、完成情况）进行分析。若有逾期任务，请务必在建议中具体提及1-2个逾期任务的名称并提示风险；若表现优秀，给予具体表扬。保持简短（60字以内），语气专业且鼓舞人心。" 
      : "As a professional coach, analyze the user's full task data (overdue, pending, completed). If there are overdue tasks, specifically mention 1-2 of them by name in your advice. If performance is good, give specific praise. Keep it short (under 50 words), professional, and encouraging.";

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { text: langPrompt },
        { text: `Task Statistics: ${promptContext}` }
      ]
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Efficiency Analysis Failed:", error);
    return ""; // Return empty to fallback to static text
  }
};
