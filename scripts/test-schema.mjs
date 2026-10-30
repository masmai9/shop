import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import fs from 'fs'
const db = new PGlite({ extensions: { pgcrypto } })
await db.exec(`create schema storage; create table storage.buckets(id text primary key, name text, public bool);
create role anon; create role authenticated;`)
const sql = fs.readFileSync(process.argv[2], 'utf8')
await db.exec(sql); await db.exec(sql) // idempotent
const cat = (await db.query(`select id from categories where slug='music'`)).rows[0].id
const p = (await db.query(`insert into products(category_id,slug,name,price,stock,images) values($1,'g1','Guitar',1000,3,'{a.jpg}') returning id`,[cat])).rows[0].id
const p2 = (await db.query(`insert into products(category_id,slug,name,price,stock) values($1,'g2','Pick',20,10) returning id`,[cat])).rows[0].id
const c = (await db.query(`insert into customers(phone,pin_hash) values('0812345678','x') returning id`)).rows[0].id
const items = JSON.stringify([{product_id:p,qty:2},{product_id:p2,qty:5}])
const o = (await db.query(`select * from place_order($1,$2::jsonb,'{}'::jsonb,'promptpay',50,1500)`,[c,items])).rows[0]
console.log('order', o.order_no, o.subtotal, o.shipping_fee, o.total)
console.log('stock after', (await db.query(`select name,stock from products order by name`)).rows)
try { await db.query(`select * from place_order($1,$2::jsonb,'{}','promptpay',50,1500)`,[c,JSON.stringify([{product_id:p,qty:2}])]) } catch(e){ console.log('expected:', e.message) }
await db.query(`select set_order_status($1,'cancelled','x')`,[o.id])
console.log('after cancel', (await db.query(`select name,stock from products order by name`)).rows)
await db.query(`select set_order_status($1,'cancelled','x')`,[o.id])
console.log('cancel twice', (await db.query(`select name,stock from products order by name`)).rows)
await db.query(`select set_order_status($1,'paid','revive')`,[o.id])
console.log('revive', (await db.query(`select name,stock from products order by name`)).rows)
console.log('events', (await db.query(`select status,note from order_events order by id`)).rows)
const o2 = (await db.query(`select * from place_order($1,$2::jsonb,'{}'::jsonb,'promptpay',50,1500)`,[c,JSON.stringify([{product_id:p2,qty:1}])])).rows[0]
console.log('small order fee', o2.subtotal, o2.shipping_fee, o2.total)
