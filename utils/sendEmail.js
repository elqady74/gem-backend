const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    // إنشاء الناقل (Transporter) باستخدام إعدادات SMTP الخاصة بـ Gmail أو غيره
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // رسالة البريد الإلكتروني
    const mailOptions = {
        from: `"Grand Egyptian Museum (GEM)" <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color: #d4af37;">Grand Egyptian Museum</h2>
        <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.</p>
        <p>يرجى إدخال الكود التالي لإتمام العملية:</p>
        <h1 style="background: #f4f4f4; padding: 10px; border-radius: 5px; display: inline-block; letter-spacing: 5px;">${options.code}</h1>
        <p>هذا الكود صالح لمدة 30 دقيقة فقط.</p>
        <p>إذا لم تطلب هذا، يمكنك تجاهل هذا البريد أماناً.</p>
      </div>
    `
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
