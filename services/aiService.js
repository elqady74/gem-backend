// services/aiService.js
const { Client } = require("@gradio/client");

async function generateAIResponse(question) {
  try {
    // الاتصال بمساحة Hugging Face المُقدمة باستخدام مفتاح الـ API
    const client = await Client.connect("rana589/chat-bot", {
      hf_token: process.env.HF_TOKEN
    });

    // إرسال السؤال والتخاطب مع دالة المُوديل
    // الرد عادة يكون بمصفوفة `data`، الإجابة غالباً في أول عنصر.
    const result = await client.predict("/chat", {
      message: question,
    });

    // جلب الإجابة النصية فقط
    const answer = result.data ? result.data[0] : "عذراً، لم أتمكن من إيجاد إجابة.";

    return answer;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw new Error("فشل الاتصال بخدمة الذكاء الاصطناعي");
  }
}

module.exports = {
  generateAIResponse
};