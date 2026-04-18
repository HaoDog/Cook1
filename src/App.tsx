import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Search, ChefHat, Utensils, Activity, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { generateRecipe, generateRecipeImage, RecipeResult } from './lib/gemini';

export default function App() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<RecipeResult | null>(null);
  const [recipeImage, setRecipeImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const DAILY_RECOMMENDATIONS = [
    { name: '番茄炒蛋', desc: '酸甜开胃，营养满分！', icon: '🍅' },
    { name: '土豆炖牛肉', desc: '肉质软烂，超级下饭！', icon: '🥔' },
    { name: '清蒸鲈鱼', desc: '原汁原味，聪明吃出来！', icon: '🐟' },
  ];

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'zh-CN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        handleGenerate(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setError('语音识别出错了，请重试或手动输入。');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setError('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
        setError('无法启动语音识别，请检查麦克风权限。');
      }
    }
  };

  const handleGenerate = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      setError('请输入你想吃的菜或食材哦！');
      return;
    }

    setIsLoading(true);
    setError('');
    setRecipe(null);
    setRecipeImage(null);

    try {
      const result = await generateRecipe(searchQuery);
      if (result) {
        setRecipe(result);
        
        // Start image generation in the background
        generateRecipeImage(result.recipeName, result.imageSeed).then(imgUrl => {
          if (imgUrl) {
            setRecipeImage(imgUrl);
          }
        }).catch(err => console.error("Background image generation failed:", err));

      } else {
        setError('哎呀，魔盒暂时想不出菜谱，请换个说法试试！');
      }
    } catch (err) {
      setError('网络好像有点问题，请稍后再试。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-gray-800 selection:bg-orange-200">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
          <div className="bg-orange-500 p-2 rounded-2xl shadow-inner text-white">
            <ChefHat size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-orange-600 tracking-tight">食光魔盒</h1>
            <p className="text-sm text-green-600 font-medium">每日一餐，美味不重样！</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Input Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-orange-100/50 border border-orange-100 relative overflow-hidden"
        >
          {/* Decorative background elements */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>

          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold text-center mb-6 text-gray-700 flex items-center justify-center gap-2">
              <Sparkles className="text-orange-400" />
              告诉魔盒，今天想吃什么？
              <Sparkles className="text-orange-400" />
            </h2>

            <div className="flex flex-col md:flex-row gap-4 items-center max-w-2xl mx-auto">
              <div className="relative w-full">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                  placeholder="例如：番茄炒蛋，或者：我有土豆和牛肉..."
                  className="w-full pl-5 pr-14 py-4 rounded-2xl border-2 border-orange-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 outline-none transition-all text-lg shadow-inner bg-orange-50/50"
                />
                <button
                  onClick={toggleListening}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${
                    isListening 
                      ? 'bg-red-100 text-red-500 animate-pulse' 
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                  title="语音输入"
                >
                  <Mic size={24} />
                </button>
              </div>
              
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    施法中...
                  </>
                ) : (
                  <>
                    <Search size={24} />
                    变出菜谱
                  </>
                )}
              </button>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-red-500 text-center mt-4 font-medium"
              >
                {error}
              </motion.p>
            )}
            
            {isListening && (
              <motion.p 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-green-600 text-center mt-4 font-medium flex items-center justify-center gap-2"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                正在倾听你的愿望...
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {recipe && !isLoading && (
            <motion.div
              key="recipe"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
              className="mt-8"
            >
              {/* Back Button */}
              <button
                onClick={() => { setRecipe(null); setQuery(''); }}
                className="mb-6 flex flex-row items-center gap-2 text-orange-600 hover:text-orange-700 font-medium bg-orange-100/50 hover:bg-orange-200 px-4 py-2 rounded-xl transition-colors w-fit"
              >
                <ArrowLeft size={20} />
                返回首页
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Recipe Card */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-orange-100/50 border border-orange-100 overflow-hidden">
                    {/* Recipe Image */}
                    <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8 relative bg-orange-100 shadow-inner">
                      {recipeImage ? (
                        <motion.img 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                          src={recipeImage}
                          alt={recipe.recipeName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-orange-400">
                           <Loader2 className="animate-spin mb-4" size={40} />
                           <span className="font-medium animate-pulse">魔法厨师正在摆盘绘制中...<br/><span className="text-sm opacity-70">(使用 Gemini AI 生成高品质美食图)</span></span>
                        </div>
                      )}
                      
                      {recipeImage && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end">
                          <div className="p-6 md:p-8 text-white w-full">
                            <h2 className="text-3xl md:text-4xl font-extrabold mb-2 text-white drop-shadow-md">{recipe.recipeName}</h2>
                            <p className="text-orange-100 font-medium text-lg drop-shadow">{recipe.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!recipeImage && (
                      <div className="mb-6 px-2">
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-2 text-gray-800">{recipe.recipeName}</h2>
                        <p className="text-orange-600 font-medium text-lg">{recipe.description}</p>
                      </div>
                    )}

                    <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-green-100 text-green-600 p-1.5 rounded-lg">🛒</span> 
                      魔法材料
                    </h3>
                    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {recipe.ingredients.map((item, index) => (
                        <li key={index} className="bg-orange-50 px-4 py-2 rounded-xl text-gray-700 font-medium border border-orange-100 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-600 p-1.5 rounded-lg">🍳</span> 
                      施法步骤
                    </h3>
                    <div className="space-y-4">
                      {recipe.steps.map((step, index) => (
                        <div key={index} className="flex gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 leading-relaxed pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nutrition Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-green-100/50 border border-green-100 sticky top-24">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-green-100 p-2.5 rounded-xl text-green-600">
                      <Activity size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">营养小助手</h3>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex justify-between items-center">
                      <span className="text-gray-600 font-medium">🔥 卡路里</span>
                      <span className="font-bold text-green-700 text-lg">{recipe.nutrition.calories}</span>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex justify-between items-center">
                      <span className="text-gray-600 font-medium">🥩 蛋白质</span>
                      <span className="font-bold text-blue-700 text-lg">{recipe.nutrition.protein}</span>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 flex justify-between items-center">
                      <span className="text-gray-600 font-medium">🥑 脂肪</span>
                      <span className="font-bold text-yellow-700 text-lg">{recipe.nutrition.fat}</span>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 relative">
                    <div className="absolute -top-3 -left-3 text-3xl">💡</div>
                    <h4 className="font-bold text-orange-800 mb-2 ml-4">健康建议</h4>
                    <p className="text-orange-700 leading-relaxed text-sm">
                      {recipe.nutrition.advice}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

          {!recipe && !isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12"
            >
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <ChefHat className="text-orange-400" />
                今日主厨推荐
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {DAILY_RECOMMENDATIONS.map((rec, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setQuery(rec.name); handleGenerate(rec.name); }}
                    className="bg-white p-6 rounded-3xl shadow-lg shadow-orange-100/30 border border-orange-100 hover:shadow-orange-200/60 hover:-translate-y-1 transition-all text-left flex flex-col gap-4 group"
                  >
                    <div className="text-5xl group-hover:scale-110 group-hover:rotate-6 transition-transform origin-bottom-left">
                      {rec.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-800">{rec.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{rec.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

