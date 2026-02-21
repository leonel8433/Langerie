
import React, { useState, useEffect, useRef } from 'react';
import { StoreState, Product } from '../types';
import { FileUp, Search, Plus, Trash2, Loader2, Sparkles, AlertTriangle, Tag, Palette, Maximize2, Image as ImageIcon, X, Camera, Globe, Info, ClipboardList, User, Minus } from 'lucide-react';
import { extractCatalog, extractFromUrl } from '../services/geminiService';
import { formatCurrency } from '../constants';

interface Props {
  state: StoreState;
  updateState: (updater: (prev: StoreState) => StoreState) => void;
}

const LOADING_STEPS = [
  { label: "Conectando ao site...", threshold: 15 },
  { label: "Mapeando catálogo...", threshold: 40 },
  { label: "Aplicando margem de 100%...", threshold: 70 },
  { label: "Finalizando vitrine...", threshold: 90 }
];

const Catalog: React.FC<Props> = ({ state, updateState }) => {
  const [search, setSearch] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [importUrl, setImportUrl] = useState('https://www.provencelingerie.com.br/');
  const [applyMarkup, setApplyMarkup] = useState(true);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [productToOrder, setProductToOrder] = useState<Product | null>(null);
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    color: '',
    size: '',
    quantity: 1
  });

  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    reference: '', 
    description: '', 
    price: '', 
    colors: '', 
    sizes: '',
    imageUrl: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (isExtracting) {
      setProgress(0);
      setLoadingStep(0);
      setError(null);
      interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + (95 - prev) * 0.1;
          const step = LOADING_STEPS.findIndex(s => next < s.threshold);
          setLoadingStep(step === -1 ? LOADING_STEPS.length - 1 : step);
          return next;
        });
      }, 600);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isExtracting]);

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.reference?.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const dataUrl = reader.result as string;
      
      try {
        const extracted = await extractCatalog(base64, file.type, applyMarkup);
        
        if (extracted.length === 0) {
          setError("Nenhum produto foi identificado. Tente um arquivo mais nítido.");
        } else {
          const productsWithImages = extracted.map(p => ({
            ...p,
            imageUrl: file.type.startsWith('image/') ? dataUrl : p.imageUrl
          }));

          updateState(prev => ({
            ...prev,
            products: [...productsWithImages, ...prev.products]
          }));
        }
      } catch (err) {
        setError("Falha na extração. Verifique o arquivo.");
      } finally {
        setIsExtracting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUrlImport = async () => {
    if (!importUrl) return;
    setIsExtracting(true);
    setShowUrlImport(false);
    
    try {
      const extracted = await extractFromUrl(importUrl, applyMarkup);
      if (extracted.length === 0) {
        setError("Não foi possível extrair produtos do link informado.");
      } else {
        updateState(prev => ({
          ...prev,
          products: [...extracted, ...prev.products]
        }));
      }
    } catch (err) {
      setError("Erro ao processar o link do fabricante.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addManualProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    
    const product: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProduct.name,
      reference: newProduct.reference,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      colors: newProduct.colors.split(',').map(c => c.trim()).filter(c => c),
      sizes: newProduct.sizes.split(',').map(s => s.trim().toUpperCase()).filter(s => s),
      imageUrl: newProduct.imageUrl
    };

    updateState(prev => ({
      ...prev,
      products: [product, ...prev.products]
    }));

    setNewProduct({ name: '', reference: '', description: '', price: '', colors: '', sizes: '', imageUrl: '' });
    setShowManualForm(false);
  };

  const removeProduct = (id: string) => {
    if (window.confirm("Deseja remover este produto?")) {
      updateState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      }));
    }
  };

  const handleCreateOrder = () => {
    if (!productToOrder || !orderForm.customerId || !orderForm.color || !orderForm.size) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const customer = state.customers.find(c => c.id === orderForm.customerId);
    if (!customer) return;

    const newOrder = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: customer.id,
      customerName: customer.name,
      productId: productToOrder.id,
      productName: productToOrder.name,
      productReference: productToOrder.reference,
      color: orderForm.color,
      size: orderForm.size,
      quantity: orderForm.quantity,
      unitPrice: productToOrder.price,
      totalAmount: productToOrder.price * orderForm.quantity,
      status: 'PENDING' as any,
      date: new Date().toISOString()
    };

    updateState(prev => ({
      ...prev,
      orders: [newOrder, ...prev.orders]
    }));

    alert("Encomenda realizada com sucesso!");
    setProductToOrder(null);
    setOrderForm({ customerId: '', color: '', size: '', quantity: 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Catálogo</h2>
          <p className="text-pink-500 text-sm font-medium italic">Gerencie seus produtos e preços</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowUrlImport(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 font-semibold"
          >
            <Globe size={20} />
            <span className="hidden md:inline">Importar via Link</span>
          </button>
          <label className={`flex items-center gap-2 bg-pink-600 text-white px-5 py-2.5 rounded-xl cursor-pointer hover:bg-pink-700 transition-all shadow-md active:scale-95 ${isExtracting ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isExtracting ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
            <span className="font-semibold">{isExtracting ? 'Processando...' : 'Importar PDF/Foto'}</span>
            <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={isExtracting} />
          </label>
          <button 
            onClick={() => setShowManualForm(!showManualForm)}
            className="flex items-center gap-2 bg-white text-pink-600 border-2 border-pink-100 px-5 py-2.5 rounded-xl hover:bg-pink-50 transition-all shadow-sm active:scale-95 font-semibold"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Novo Manual</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-pink-50 p-3 rounded-xl border border-pink-100">
         <div className="flex items-center gap-2">
            <input 
               type="checkbox" 
               id="markup-toggle" 
               checked={applyMarkup} 
               onChange={(e) => setApplyMarkup(e.target.checked)}
               className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
            />
            <label htmlFor="markup-toggle" className="text-sm font-bold text-pink-800 flex items-center gap-2 cursor-pointer">
               Aplicar Margem de 100% (Dobrar Preço) em novas importações
               <span title="Ao ativar, o sistema assumirá que os preços do fabricante são de atacado e dobrará o valor automaticamente.">
                  <Info size={14} />
               </span>
            </label>
         </div>
      </div>

      {showUrlImport && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100 animate-in fade-in slide-in-from-top-4">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <Globe className="text-blue-600" /> Importar do Site do Fabricante
              </h3>
              <button onClick={() => setShowUrlImport(false)}><X size={20}/></button>
           </div>
           <p className="text-sm text-gray-500 mb-4">Insira o link da página de produtos ou categoria. A IA irá extrair os dados e aplicar a margem configurada.</p>
           <div className="flex gap-2">
              <input 
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-800"
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://www.provencelingerie.com.br/categoria..."
              />
              <button 
                onClick={handleUrlImport}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
              >
                 Extrair Agora
              </button>
           </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="flex-shrink-0" size={20} />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs font-bold uppercase hover:underline">Fechar</button>
        </div>
      )}

      {showManualForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-pink-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4 border-b pb-2">
            <h3 className="text-lg font-bold text-gray-800">Cadastro Manual</h3>
            <button onClick={() => setShowManualForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Foto</label>
              <div className="relative group aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden hover:border-pink-300 transition-colors">
                {newProduct.imageUrl ? (
                  <>
                    <img src={newProduct.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    <button onClick={() => setNewProduct(prev => ({ ...prev, imageUrl: '' }))} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <Camera className="text-gray-300 mb-2" size={32} />
                    <input type="file" accept="image/*" onChange={handleManualImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </>
                )}
              </div>
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input placeholder="Referência (REF)" className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" value={newProduct.reference} onChange={e => setNewProduct({...newProduct, reference: e.target.value})} />
              <input placeholder="Nome do Produto" className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
              <input type="number" placeholder="Preço" className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input placeholder="Tamanhos (P, M, G...)" className="w-full p-3 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none" value={newProduct.sizes} onChange={e => setNewProduct({...newProduct, sizes: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end mt-6 gap-3">
            <button onClick={() => setShowManualForm(false)} className="px-5 py-2 text-gray-500 font-semibold hover:text-gray-700">Cancelar</button>
            <button onClick={addManualProduct} className="bg-pink-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-pink-700 shadow-lg shadow-pink-100 transition-all active:scale-95">Salvar</button>
          </div>
        </div>
      )}

      {isExtracting && (
        <div className="bg-white p-12 rounded-2xl shadow-xl border border-pink-100 flex flex-col items-center justify-center space-y-6">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle className="text-pink-50 stroke-current" strokeWidth="6" cx="50" cy="50" r="40" fill="transparent"></circle>
              <circle className="text-pink-600 stroke-current transition-all duration-500 ease-out" strokeWidth="6" strokeDasharray={`${progress * 2.51} 251`} strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent"></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="text-pink-600 animate-pulse" size={40} />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h4 className="text-xl font-bold text-gray-800">{LOADING_STEPS[loadingStep].label}</h4>
            <p className="text-gray-500">Estamos processando as informações do catálogo Provence.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <Search className="text-gray-400" size={22} />
          <input 
            placeholder="Pesquisar por nome ou referência..."
            className="bg-transparent border-none outline-none w-full text-gray-800 text-lg placeholder:text-gray-300 font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-widest font-bold">
                <th className="px-8 py-4 w-24">Foto</th>
                <th className="px-8 py-4">REF</th>
                <th className="px-8 py-4">Produto</th>
                <th className="px-8 py-4">Preço</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-pink-50/20 transition-colors group">
                  <td className="px-8 py-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center cursor-zoom-in" onClick={() => setSelectedProductForDetails(product)}>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
                      ) : (
                        <ImageIcon size={18} className="text-gray-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-bold">
                      {product.reference || "S/ REF"}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className="font-bold text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{product.description}</p>
                  </td>
                  <td className="px-8 py-5 font-bold text-pink-600">{formatCurrency(product.price)}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setProductToOrder(product);
                          setOrderForm(prev => ({ ...prev, color: product.colors?.[0] || '', size: product.sizes?.[0] || '' }));
                        }}
                        className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Encomendar"
                      >
                        <ClipboardList size={18} />
                      </button>
                      <button 
                        onClick={() => setSelectedProductForDetails(product)}
                        className="p-2 text-gray-300 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-all"
                        title="Ver Detalhes"
                      >
                        <Maximize2 size={18} />
                      </button>
                      <button onClick={() => removeProduct(product.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Details Modal */}
      {selectedProductForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="relative h-64 bg-pink-50">
               {selectedProductForDetails.imageUrl ? (
                 <img src={selectedProductForDetails.imageUrl} className="w-full h-full object-cover" alt={selectedProductForDetails.name} />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-pink-200">
                    <ImageIcon size={64} />
                 </div>
               )}
               <button 
                onClick={() => setSelectedProductForDetails(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white text-gray-600 rounded-full shadow-lg transition-all"
               >
                 <X size={20} />
               </button>
               <div className="absolute bottom-4 left-6">
                  <span className="bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    REF: {selectedProductForDetails.reference || "Sem Referência"}
                  </span>
               </div>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-bold text-gray-800 leading-tight">{selectedProductForDetails.name}</h3>
                    <p className="text-pink-600 text-2xl font-black mt-1">{formatCurrency(selectedProductForDetails.price)}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</span>
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-sm bg-green-50 px-3 py-1 rounded-full">
                      <Sparkles size={14} /> Em Catálogo
                    </span>
                  </div>
               </div>

               <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Tag size={12} className="text-pink-500" /> Descrição Completa
                  </h4>
                  <p className="text-gray-600 leading-relaxed italic border-l-2 border-pink-100 pl-4">
                    {selectedProductForDetails.description || "Este produto não possui uma descrição detalhada cadastrada no momento."}
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Palette size={12} className="text-pink-500" /> Cores Disponíveis
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForDetails.colors && selectedProductForDetails.colors.length > 0 ? (
                        selectedProductForDetails.colors.map((color, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-semibold border border-gray-200">
                            {color}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs italic">Cores não especificadas</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Maximize2 size={12} className="text-pink-500" /> Grade de Tamanhos
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProductForDetails.sizes && selectedProductForDetails.sizes.length > 0 ? (
                        selectedProductForDetails.sizes.map((size, idx) => (
                          <span key={idx} className="w-8 h-8 flex items-center justify-center bg-pink-50 text-pink-700 rounded-full text-xs font-bold border border-pink-100">
                            {size}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400 text-xs italic">Tamanhos não especificados</span>
                      )}
                    </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={() => setSelectedProductForDetails(null)}
                    className="bg-gray-100 text-gray-700 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Fechar Detalhes
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      {productToOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ClipboardList className="text-blue-600" /> Encomendar Peça
              </h3>
              <button onClick={() => setProductToOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  {productToOrder.imageUrl ? (
                    <img src={productToOrder.imageUrl} className="w-full h-full object-cover" alt={productToOrder.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={24} />
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{productToOrder.name}</h4>
                  <p className="text-xs text-gray-500 font-mono">REF: {productToOrder.reference || 'S/ REF'}</p>
                  <p className="text-sm font-bold text-pink-600">{formatCurrency(productToOrder.price)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} className="text-pink-500" /> Cliente
                  </label>
                  <select 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                    value={orderForm.customerId}
                    onChange={e => setOrderForm({ ...orderForm, customerId: e.target.value })}
                  >
                    <option value="">Selecione um cliente...</option>
                    {state.customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Palette size={14} className="text-pink-500" /> Cor
                    </label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                      value={orderForm.color}
                      onChange={e => setOrderForm({ ...orderForm, color: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {productToOrder.colors?.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="Outra">Outra</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                      <Maximize2 size={14} className="text-pink-500" /> Tamanho
                    </label>
                    <select 
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500 font-medium"
                      value={orderForm.size}
                      onChange={e => setOrderForm({ ...orderForm, size: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {productToOrder.sizes?.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Plus size={14} className="text-pink-500" /> Quantidade
                  </label>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setOrderForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="text-lg font-bold w-8 text-center">{orderForm.quantity}</span>
                    <button 
                      onClick={() => setOrderForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={handleCreateOrder}
                  className="w-full bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  Confirmar Encomenda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
