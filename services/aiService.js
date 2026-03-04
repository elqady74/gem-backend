// services/aiService.js
const { Client } = require("@gradio/client");

async function generateAIResponse(question) {
  try {
    // الاتصال بمساحة Hugging Face المُقدمة باستخدام مفتاح الـ API للـ Client
    const client = await Client.connect("rana589/chat-bot", {
      hf_token: process.env.HF_TOKEN
    });

    // استدعاء المسار الحقيقي الذي وجدناه في الـ API: /chat_with_gem_1
    // يجب تمرير برامترات محددة بالترتيب بناءً على بناء الموديل
    const result = await client.predict("/chat_with_gem_1", {
      message: question,                 // 1. السؤال
      history: [],                       // 2. المحادثات السابقة (نرسلها فارغة حالياً)
      api_key_input: process.env.OPENROUTER_API_KEY, // 3. مفتاح API للنموذج (OpenRouter)
      provider_choice: "openrouter",     // 4. المزود
      image: null,                       // 5. صورة (لا يوجد)
    });

    // الرد عبارة عن مصفوفة تاريخ الشات `history`. الإجابة الأخيرة ستكون في آخر عنصر من المصفوفة، دور `assistant`
    let answer = "عذراً، لم أتمكن من إيجاد إجابة.";
    if (result.data && result.data[0] && Array.isArray(result.data[0]) && result.data[0].length > 0) {
      const chatHistory = result.data[0];
      const lastMessage = chatHistory[chatHistory.length - 1]; // العنصر الأخير هو رد الذكاء الاصطناعي

      // نستخرج النص من مصفوفة الـ content
      if (lastMessage && lastMessage.role === "assistant" && lastMessage.content && lastMessage.content[0]) {
        answer = lastMessage.content[0].text || answer;
      }
    }

    return answer;
  } catch (error) {
    console.error("AI Service Error:", error);
    
    // Check for authentication errors from the API
    if (error.response && error.response.status === 401) {
      throw new Error(`❌ خطأ في المصادقة (401): ${error.response.data?.error?.message || 'فشل التحقق من بيانات API'}`);
    }
    
    // Check for the specific "User not found" error
    if (error.message && error.message.includes("User not found")) {
      throw new Error(`❌ خطأ: مستخدم غير موجود - تحقق من صلاحية مفتاح OPENROUTER_API_KEY`);
    }
    
    if (error.message && error.message.includes("401")) {
      throw new Error(`❌ خطأ في المصادقة: ${error.message}`);
    }
    
    throw new Error(`❌ فشل الاتصال بخدمة الذكاء الاصطناعي: ${error.message}`);
  }
}

module.exports = {
  generateAIResponse
};