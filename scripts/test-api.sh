#!/usr/bin/env bash
BASE="${1:-https://contatos.zairagoncalves.com}"
TMP=$(mktemp)
PASS=0
FAIL=0

run() {
  local num="$1" desc="$2" expected="$3" method="$4" path="$5" data="$6"
  local args=(-s -o "$TMP" -w "%{http_code}" -X "$method" "$BASE$path")
  if [ -n "$data" ]; then
    args+=(-H "Content-Type: application/json" --data-binary @-)
  fi
  local status bytes body result
  status=$(printf '%s' "$data" | curl "${args[@]}")
  bytes=$(wc -c < "$TMP" | tr -d ' ')
  body=$(head -c 250 "$TMP")
  if [ "$status" = "$expected" ]; then result="PASS"; PASS=$((PASS+1)); else result="FAIL"; FAIL=$((FAIL+1)); fi
  printf '%-3s %-4s exp=%s got=%s bytes=%s | %s\n    %s\n' "$num" "$result" "$expected" "$status" "$bytes" "$desc" "$body"
}

extract_id() {
  grep -o '"id":[0-9]*' "$TMP" | head -1 | cut -d: -f2
}

BIG=$(printf '%*s' 11000 '' | tr ' ' 'a')

echo "BASE: $BASE"
echo "DATE: $(date)"
echo

run 1  "POST valid contact"              201 POST /contatos '{"nome":"João Silva","telefone":"(11) 98765-4321"}'
ID=$(extract_id)
run 2  "POST single word name"           400 POST /contatos '{"nome":"João","telefone":"11987654321"}'
run 3  "POST short middle word"          400 POST /contatos '{"nome":"Maria da Silva","telefone":"11987654321"}'
run 4  "POST first word 2 letters"       400 POST /contatos '{"nome":"Jo Silva","telefone":"11987654321"}'
run 5  "POST name with digit"            400 POST /contatos '{"nome":"João Silva2","telefone":"11987654321"}'
run 6  "POST phone too short"            400 POST /contatos '{"nome":"João Silva","telefone":"12345"}'
run 7  "POST phone with letter"          400 POST /contatos '{"nome":"João Silva","telefone":"11a987654321"}'
run 8  "POST phone with +55"             400 POST /contatos '{"nome":"João Silva","telefone":"+55 11 98765-4321"}'
run 9  "POST area code starting with 0"  400 POST /contatos '{"nome":"João Silva","telefone":"(01) 98765-4321"}'
run 10 "POST unknown field"              400 POST /contatos '{"nome":"João Silva","telefone":"11987654321","email":"a@b.com"}'
run 11 "POST missing telefone"           400 POST /contatos '{"nome":"João Silva"}'
run 12 "POST malformed JSON"             400 POST /contatos '{"nome":'
run 13 "POST without body"               400 POST /contatos ''
run 14 "POST payload over 10kb"          413 POST /contatos "{\"nome\":\"$BIG\",\"telefone\":\"11987654321\"}"
run 15 "POST normalizes spaces"          201 POST /contatos '{"nome":"  José   Conceição  ","telefone":"11 3456-7890"}'
ID2=$(extract_id)
run 16 "GET list"                        200 GET  /contatos ''
run 17 "PATCH only nome"                 200 PATCH "/contatos/$ID" '{"nome":"João Pereira"}'
run 18 "PATCH only telefone"             200 PATCH "/contatos/$ID" '{"telefone":"11 3456-7890"}'
run 19 "PATCH empty body"                400 PATCH "/contatos/$ID" '{}'
run 20 "PATCH invalid name"              400 PATCH "/contatos/$ID" '{"nome":"Ana"}'
run 21 "PATCH unknown field"             400 PATCH "/contatos/$ID" '{"email":"a@b.com"}'
run 22 "PATCH id abc"                    400 PATCH /contatos/abc '{"nome":"João Silva"}'
run 23 "PATCH id 0"                      400 PATCH /contatos/0 '{"nome":"João Silva"}'
run 24 "PATCH id above INT UNSIGNED"     400 PATCH /contatos/4294967296 '{"nome":"João Silva"}'
run 25 "PATCH non-existent id"           404 PATCH /contatos/999999 '{"nome":"João Silva"}'
run 26 "DELETE contact (bytes must be 0)" 204 DELETE "/contatos/$ID" ''
run 27 "DELETE same contact again"       404 DELETE "/contatos/$ID" ''
run 28 "DELETE id abc"                   400 DELETE /contatos/abc ''
run 29 "GET unknown route"               404 GET  /rota-inexistente ''
run 30 "GET swagger docs"                200 GET  /docs/ ''

[ -n "$ID2" ] && curl -s -o /dev/null -X DELETE "$BASE/contatos/$ID2"
rm -f "$TMP"

echo
echo "RESULT: $PASS passed, $FAIL failed"
