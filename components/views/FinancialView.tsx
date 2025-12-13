

import React, { useState, useEffect } from 'react';
import { User, Payment } from '../../types.ts';
import { supabase } from '../../application/supabase.ts';
import { CurrencyDollarIcon, CreditCardIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '../Icons.tsx';

interface FinancialViewProps {
    user: User;
}

const FinancialView: React.FC<FinancialViewProps> = ({ user }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [monthlyFee, setMonthlyFee] = useState(25); // Valor por defecto seguro

    const [stats, setStats] = useState({ 
        totalPaid: 0, 
        totalDebt: 0, 
        expectedTotal: 0,
        nextDueDate: '',
        monthsPending: 0
    });

    useEffect(() => {
        const fetchFinancialData = async () => {
            // 1. Obtener ID del estudiante
            const { data: userData } = await supabase.from('estudiantes').select('id, matricula').eq('nombre', user.name).single();
            if (!userData) { setLoading(false); return; }

            // 2. Obtener Pagos Y Configuración del Plan
            const { data: paymentData } = await supabase
                .from('pagos')
                .select('*')
                .eq('student_id', userData.id)
                .order('date', { ascending: false });

            const allRecords = (paymentData || []) as Payment[];
            
            // A. BUSCAR CONFIGURACIÓN DEL PLAN (Guardado como un registro especial tipo 'plan_config')
            const planConfigRecord = allRecords.find(p => p.type === 'plan_config');
            const currentFee = planConfigRecord ? planConfigRecord.amount : 25; // Default $25 si no ha sido configurado por admin
            
            // CRUCIAL: Utilizar fecha de inicio configurada o fallback a septiembre
            let startDate = new Date('2024-09-01');
            if(planConfigRecord && planConfigRecord.date) {
                startDate = new Date(planConfigRecord.date);
            }

            setMonthlyFee(currentFee);

            // B. FILTRAR SOLO PAGOS REALES (Excluir configuraciones)
            const realPayments = allRecords.filter(p => p.type !== 'plan_config');

            // 3. Calcular Deuda Esperada (Lógica del Negocio)
            const now = new Date();
            
            // Cálculo de meses transcurridos
            let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
            if (monthsDiff < 0) monthsDiff = 0;
            const totalMonths = monthsDiff + 1; 

            const inscriptionFee = 10;
            const expectedTotal = inscriptionFee + (currentFee * totalMonths);

            // Próxima fecha de vencimiento
            const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 5);
            
            const totalPaid = realPayments.reduce((acc, curr) => acc + curr.amount, 0);
            
            const totalDebt = Math.max(0, expectedTotal - totalPaid);
            
            // Cálculo de meses pendientes
            const monthsPending = totalDebt > 0 ? (totalDebt / currentFee).toFixed(1) : 0;

            setPayments(realPayments);
            setStats({
                expectedTotal,
                totalPaid,
                totalDebt,
                nextDueDate: nextDue.toLocaleDateString(),
                monthsPending: Number(monthsPending)
            });
            setLoading(false);
        };

        fetchFinancialData();
    }, [user]);

    // Helper para obtener el nombre del mes
    const getMonthName = (dateStr: string) => {
        const date = new Date(dateStr);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(adjustedDate);
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando información financiera...</div>;

    const isDebtFree = stats.totalDebt <= 0;

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                        <CurrencyDollarIcon className="h-8 w-8 mr-3 text-green-600"/>
                        Estado Financiero
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-11">
                        Información actualizada al {new Date().toLocaleDateString()}.
                    </p>
                </div>

                {/* VISUALIZADOR DE PLAN (SOLO LECTURA) */}
                <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-bold text-gray-500 uppercase">Tu Plan Asignado:</span>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">${monthlyFee}/mes</span>
                </div>
            </div>

            {/* TARJETAS DE RESUMEN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* TARJETA 1: TOTAL PAGADO */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500 relative overflow-hidden">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium z-10 relative">Total Abonado</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 z-10 relative">${stats.totalPaid.toFixed(2)}</p>
                    <p className="text-xs text-blue-500 mt-2 z-10 relative">Ciclo 2024-2025</p>
                    <div className="absolute right-0 bottom-0 opacity-10">
                        <CurrencyDollarIcon className="h-24 w-24 text-blue-500" />
                    </div>
                </div>

                {/* TARJETA 2: SALDO PENDIENTE (CON LÓGICA DE COLOR) */}
                <div className={`p-6 rounded-xl shadow-md border-l-4 relative overflow-hidden transition-all duration-500 ${isDebtFree ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-red-50 dark:bg-red-900/20 border-red-500'}`}>
                    <div className="flex justify-between items-start">
                        <p className={`text-sm font-medium ${isDebtFree ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {isDebtFree ? 'Estado de Cuenta' : 'Saldo Deudor'}
                        </p>
                        {!isDebtFree && <span className="bg-red-200 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">VENCIDO</span>}
                    </div>
                    
                    <p className={`text-3xl font-bold mt-1 ${isDebtFree ? 'text-green-800 dark:text-green-200' : 'text-red-600 dark:text-red-200'}`}>
                        ${stats.totalDebt.toFixed(2)}
                    </p>
                    
                     {isDebtFree ? (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center font-bold">
                            <CheckCircleIcon className="h-4 w-4 mr-1"/> ¡Estás al día!
                        </p>
                    ) : (
                         <div className="mt-2">
                             <p className="text-xs text-red-600 dark:text-red-300 flex items-center font-bold uppercase">
                                 <ExclamationTriangleIcon className="h-4 w-4 mr-1"/>
                                 {stats.monthsPending} {stats.monthsPending === 1 ? 'Cuota pendiente' : 'Cuotas pendientes'}
                             </p>
                             <p className="text-[10px] text-red-500 mt-1 opacity-80">Calculado sobre plan de ${monthlyFee}</p>
                         </div>
                    )}
                </div>

                {/* TARJETA 3: MÉTODOS */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-purple-500">
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Reportar Pago</p>
                     <div className="mt-3 flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-bold">Zelle</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-bold">Pago Móvil</span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-bold">Efectivo</span>
                     </div>
                     <p className="text-xs text-gray-400 mt-2">Envía tu comprobante a Administración</p>
                </div>
            </div>

            {/* TABLA DE HISTORIAL */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
                        <ClockIcon className="h-5 w-5 mr-2 text-gray-500"/>
                        Historial de Transacciones
                    </h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Concepto</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mes</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Método</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {payments.length > 0 ? (
                                payments.map((pay) => (
                                    <tr key={pay.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(pay.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                            {pay.description}
                                            {pay.type === 'inscription' && <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 uppercase">Inscripción</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 capitalize">
                                                {getMonthName(pay.date)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center">
                                                <span>{pay.method}</span>
                                                <span className="text-[10px] text-gray-400">Ref: {pay.reference || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600 dark:text-green-400">
                                            +${pay.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No hay pagos registrados aún.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="text-center text-xs text-gray-400 mt-4">
                <p>Todos los pagos son verificados por la administración del LTS.</p>
                <p>Si encuentras un error, contacta a dirección.</p>
            </div>
        </div>
    );
};

export default FinancialView;
