import requests

url="https://openrouter.ai/api/v1/chat/completions"

headers={
 "Authorization":"Bearer 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",
 "Content-Type":"application/json",
 "HTTP-Referer":"http://localhost",
 "X-Title":"test"
}

data={
 "model":"openai/gpt-4o-mini",
 "messages":[{"role":"user","content":"hello"}]
}

r=requests.post(url,headers=headers,json=data,timeout=20)
print(r.status_code)
print(r.text)
