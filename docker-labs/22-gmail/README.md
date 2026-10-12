# 🐳 Lab 22 — Gmail: "delivered" bolne se pehle kya-kya ho chuka hota hai

System Gurukul → 🌍 Planet-scale Infra → **Gmail** levels ka lab. Zero dependency Node (18+).

```bash
npm start ex1-ack               # store-a (4981) + store-b (4982) + frontend (4983)
node tools/ack.js               # ack pehle vs ack baad mein, site A crash ke saath
node tools/labels.js            # label = query, folder-move se kitna sasta
npm start ex2-smtp              # MX server (4984), 20% ACK kho jaate hain
node tools/smtp.js
npm start ex3-attachments       # blobstore (4985)
node tools/attach.js
docker compose --profile ex1-ack up --build    # profiles: ex1-ack, ex2-smtp, ex3-attachments
```

## ex1-ack — "delivered" kab bolein?

200 mails. Mail #120 ke baad **site A gir jaati hai**. `ACK=before` = site A par likh ke turant "delivered"
(site B ko background mein bhejenge). `ACK=after` = dono sites par likhne ke baad hi "delivered".

```
$ node tools/ack.js
ack mode        user ko "delivered" bola   site B par asli mails   KHO GAYE   ack latency
before                   120                      100           20      4.85 ms
after                    120                      120            0      6.09 ms
```

`before`: 20 mails aise the jinka "delivered" bola ja chuka tha par woh sirf A par the → **gaye**. Bhejne wale ko lagta hai
mail pahunch gaya, aapko kabhi nahi milega — email ka sabse bura failure.
`after`: 0 khoye, keemat **~1.2 ms extra** (yahan localhost; asli duniya mein ek cross-region round trip).
Yahi CAP ka faisla hai: Gmail **consistency** chunta hai, availability nahi.

## ex1 (dusra tool) — Inbox ek folder hai ya ek query?

5,000 mails, sab archive. `folder-move` = mail ka poora record nayi jagah likho. `label` = sirf `inbox` label hatao.

```
$ node tools/labels.js
tareeka        archive ke liye rows likhe   bytes likhe   archive ke baad Inbox
folder-move            5000          10757786           0 mails
label                  5000            253893           0 mails

ek hi mail teen jagah: {"id":"m1","subject":"Sale 1","labels":["archive","inbox","work","starred"]}
```

**42× kam bytes** (10.7 MB → 254 KB). Aur ek hi mail ek saath Inbox + Work + Starred mein ho sakta hai — 3 copies nahi,
3 labels. "Inbox" = `WHERE labels CONTAINS 'inbox'`.

## ex2-smtp — 20% ACK kho jaate hain

Mail server ko mail mil gaya, par "250 OK" raaste mein gum → bhejne wala **dobara** bhejta hai (SMTP ka niyam).

```
$ node tools/smtp.js
Message-ID check   bheje   retry hue   receiver ke inbox mein   DUPLICATE
nahi                 500         114                    614         114
haan                 500         146                    500           0
```

SMTP sirf **at least once** deta hai. "Exactly once" receiver banata hai: `Message-ID` yaad rakho, dobara aaye toh
mailbox mein mat daalo. (Isi liye har mail mein `Message-ID: <...@domain>` header hota hai.)

## ex3-attachments — HR ne 10,000 logon ko 5 MB PDF bheja

```
$ node tools/attach.js
dedup    10,000 logon ke baad storage   objects            1 banda delete → chhoota   baaki 9,999 delete → chhoota
nahi         48.83 GB   10000 object(s)        5 MB        48.82 GB
haan             5 MB   1 object(s)            0 MB            5 MB
```

Content ka SHA-256 hi uska naam → same file dobara aayi toh sirf **refcount++**. 48.83 GB → **5 MB**.
Aur isi liye ek banda delete kare toh **0 bytes** chhootte hain — aakhri reference jaane par hi.

## Kya seekha

| Sawaal | Jawab lab se |
|---|---|
| "Delivered" kab bolein? | Dono sites par likhne ke baad — 20 mails khone se bachne ki keemat 1.2 ms |
| Archive karna mehenga kyun nahi? | Label hataana = 254 KB vs mail move = 10.7 MB |
| ACK kho gaya, mail dobara aaya | Message-ID se dedup: 114 duplicates → 0 |
| Same attachment 10,000 logon ko | SHA-256 dedup + refcount: 48.83 GB → 5 MB |
