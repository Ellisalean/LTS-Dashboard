
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
    const [stats, setStats] = useState({ 
        totalPaid: 0, 
        totalDebt: 0, 
        expectedTotal: 0,
        nextDueDate: ''
    });

    useEffect(() => {
        const fetchFinancialData = async () => {
            // 1. Obtener ID del estudiante
            const { data: userData } = await supabase.from('estudiantes').select('id, matricula').eq('nombre', user.name).single();
            if (!userData) { setLoading(false); return; }

            // 2. Calcular Deuda Esperada (Lógica del Negocio)
            // Fecha Inicio: 1 Septiembre 2024
            const startDate = new Date('2024-09-01');
            const now = new Date();
            
            // Cálculo de meses transcurridos desde Sept 2024
            let monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
            if (monthsDiff < 0) monthsDiff = 0;
            // Sumamos 1 porque la mensualidad del mes corriente ya cuenta
            const totalMonths = monthsDiff + 1; 

            const inscriptionFee = 10;
            const monthlyFee = 20;
            const expectedTotal = inscriptionFee + (monthlyFee * totalMonths);

            // Próxima fecha de vencimiento (Día 5 del mes siguiente)
            const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 5);
            
            // 3. Obtener Pagos Realizados
            const { data: paymentData } = await supabase
                .from('pagos')
                .select('*')
                .eq('student_id', userData.id)
                .order('date', { ascending: false });

            const loadedPayments = (paymentData || []) as Payment[];
            const totalPaid = loadedPayments.reduce((acc, curr) => acc + curr.amount, 0);
            
            setPayments(loadedPayments);
            setStats({
                expectedTotal,
                totalPaid,
                totalDebt: Math.max(0, expectedTotal - totalPaid),
                nextDueDate: nextDue.toLocaleDateString()
            });
            setLoading(false);
        };

        fetchFinancialData();
    }, [user]);

    // Helpers para visualización
    const getTrimester = (dateStr: string) => {
        const d = new Date(dateStr);
        const month = d.getMonth(); // 0-11
        if (month >= 8 && month <= 11) return 'Sept - Dic'; // Sept(8) - Dec(11)
        if (month >= 0 && month <= 2) return 'Ene - Mar';
        if (month >= 3 && month <= 5) return 'Abr - Jun';
        return 'Vacacional';
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando información financiera...</div>;

    const isDebtFree = stats.totalDebt <= 0;

    return (
        <div className="space-y-8 animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <CurrencyDollarIcon className="h-8 w-8 mr-3 text-green-600"/>
                    Estado Financiero
                </h1>
                {!isDebtFree && (
                    <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-bold text-sm flex items-center animate-pulse">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-2"/>
                        Cuota Pendiente
                    </span>
                )}
            </div>

            {/* TARJETAS DE RESUMEN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pagado</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">${stats.totalPaid.toFixed(2)}</p>
                    <p className="text-xs text-blue-500 mt-2">Acumulado desde Sept 2024</p>
                </div>

                <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 ${isDebtFree ? 'border-green-500' : 'border-red-500'}`}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Saldo Pendiente</p>
                    <p className={`text-3xl font-bold mt-1 ${isDebtFree ? 'text-green-600' : 'text-red-600'}`}>${stats.totalDebt.toFixed(2)}</p>
                     {isDebtFree ? (
                        <p className="text-xs text-green-600 mt-2 flex items-center"><CheckCircleIcon className="h-3 w-3 mr-1"/> Estás al día</p>
                    ) : (
                         <p className="text-xs text-red-500 mt-2 flex items-center font-bold">Vence pronto: {stats.nextDueDate}</p>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border-l-4 border-purple-500">
                     <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Métodos de Pago</p>
                     <div className="mt-3 flex space-x-2">
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-600 dark:text-gray-300">Zelle</span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-600 dark:text-gray-300">Efectivo</span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded text-gray-600 dark:text-gray-300">Transferencia</span>
                     </div>
                     <p className="text-xs text-gray-400 mt-2">Reporta tu pago en administración</p>
                </div>
            </div>

            {/* TABLA DE HISTORIAL */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
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
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trimestre</th>
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
                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                                {getTrimester(pay.date)}
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
