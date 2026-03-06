// services/aiService.js

async function generateAIResponse(question) {
  try {
    // Dynamically import ES Module
    const { Client } = await import("@gradio/client");

    const withTimeout = (promise, ms, errorMsg) => {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(errorMsg)), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    };

    // الاتصال بمساحة Hugging Face المُقدمة باستخدام مفتاح الـ API للـ Client
    const client = await withTimeout(
      Client.connect("rana589/chat-bot", { hf_token: process.env.HF_TOKEN }),
      20000,
      "HuggingFace Space connection timed out (Token might be invalid)"
    );

    // استدعاء المسار الحقيقي
    const result = await withTimeout(
      client.predict("/chat_with_gem_1", {
        message: question,
        history: [],
        api_key_input: process.env.OPENROUTER_API_KEY,
        provider_choice: "openrouter",
        image: null,
      }),
      30000,
      "AI generation timed out (OpenRouter Key might be invalid)"
    );

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

    // Gradio يعيد أحياناً الأخطاء كنص داخل الإجابة بدلاً من رمي استثناء
    if (answer.includes("Error code: 401") || answer.includes("User not found")) {
      throw new Error("❌ خطأ: مستخدم غير موجود - تحقق من صلاحية مفتاح OPENROUTER_API_KEY (غالباً المفتاح تم إيقافه لتسريبه)");
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