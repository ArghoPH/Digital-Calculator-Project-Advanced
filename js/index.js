
    const { createApp } = Vue;
    const apiKey = "YOUR_GOOGLE_GEMINI_API_KEY_HERE"; 

    createApp({
        data() {
            return {
                current: '',
                history: '',
                userInput: '',
                messages: [], // Format: { role: 'user' | 'ai', content: string }
                loading: false,
                error: null
            }
        },
        methods: {
            clear() {
                this.current = '';
                this.history = '';
                this.error = null;
            },
            append(char) {
                this.error = null;
                this.current += char;
            },
            calculate() {
                if (!this.current) return;
                try {
                    this.history = this.current;
                    const result = math.evaluate(this.current);
                    this.current = math.format(result, { precision: 14 }).toString();
                } catch (e) {
                    this.error = "ইনপুট সঠিক নয়!";
                }
            },
            scrollToBottom() {
                this.$nextTick(() => {
                    const container = this.$refs.chatContainer;
                    if (container) container.scrollTop = container.scrollHeight;
                });
            },
            async solveWithAI() {
                if (!this.current) {
                    this.error = "আগে ম্যাথ ইনপুট দিন!";
                    return;
                }
                const prompt = `এই অংকটি সমাধান করো: ${this.current}`;
                this.messages.push({ role: 'user', content: `Calculator Solve: ${this.current}` });
                this.scrollToBottom();
                await this.processAIRequest(prompt, "You are a professional math tutor.");
            },
            async chatWithAI() {
                if (!this.userInput || this.loading) return;
                const query = this.userInput;
                this.messages.push({ role: 'user', content: query });
                this.userInput = '';
                this.scrollToBottom();
                await this.processAIRequest(query, "Advanced math expert.");
            },
            async processAIRequest(query, instruction) {
                this.loading = true;
                this.error = null;
                
                const systemPrompt = `${instruction} 
                Response format: Strictly use Bengali Language (বাংলা ভাষা). 
                Step-by-step clear reasoning daw. Markdown bold use koro results er jonno.`;
                
                try {
                    const response = await this.callGemini(query, systemPrompt);
                    this.messages.push({ role: 'ai', content: response });
                    this.scrollToBottom();
                } catch (err) {
                    this.error = "সার্ভার সমস্যা। আবার চেষ্টা করুন।";
                } finally {
                    this.loading = false;
                }
            },
            async callGemini(query, systemPrompt, retries = 5) {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
                
                for (let i = 0; i < retries; i++) {
                    try {
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: query }] }],
                                systemInstruction: { parts: [{ text: systemPrompt }] }
                            })
                        });

                        if (!response.ok) throw new Error('API Error');
                        const data = await response.json();
                        return data.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত, কোনো উত্তর পাওয়া যায়নি।";
                    } catch (err) {
                        if (i === retries - 1) throw err;
                        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
                    }
                }
            }
        }
    }).mount('#app')
