/* 500 mails bhejo. 20% ACK kho jaate hain → bhejne wala dobara bhejta hai (SMTP ka niyam: ACK nahi mila = phir bhejo).
   node tools/smtp.js */
const { post, get, host } = require('../lib/util');
const M = `http://${host('mx')}:4984`;
async function send(body) { for (let t = 1; t <= 10; t++) { try { const r = await post(M + '/smtp', body); if (r && r.ok) return t; } catch (e) {} } return 10; }
(async () => {
  console.log('Message-ID check   bheje   retry hue   receiver ke inbox mein   DUPLICATE');
  for (const idem of [false, true]) {
    await post(M + '/mode', { idempotent: idem, lose: 0.2 });
    let tries = 0;
    for (let i = 1; i <= 500; i++) tries += await send({ messageId: `<${i}.2026@gurukul.mail>`, from: 'hr@company.com', subject: 'Offer letter ' + i });
    const s = await get(M + '/stats');
    console.log(`${(idem ? 'haan' : 'nahi').padEnd(18)} ${String(500).padStart(5)}   ${String(tries - 500).padStart(9)}   ${String(s.inbox).padStart(20)}   ${String(s.inbox - 500).padStart(9)}`);
  }
  console.log('\nSMTP "at least once" deta hai. "Exactly once" receiver banata hai — Message-ID yaad rakh ke.');
})();
