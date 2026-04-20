/**
 * Store Checkout Page — /store/[storeSlug]/checkout
 * Multi-step checkout: Address → Shipping → Payment → Confirm
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import StoreLayout from '../../../components/store/StoreLayout';
import { useStore } from '../../../components/store/StoreLayout';
import { storeApi } from '../../../lib/storeApi';
import {
  MapPinIcon,
  TruckIcon,
  CreditCardIcon,
  CheckCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'review';

function CheckoutPage() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  const store = useStore();

  const [step, setStep] = useState<CheckoutStep>('address');
  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selected options
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string>('standard');
  const [paymentMethod, setPaymentMethod] = useState<string>('cod');
  const [notes, setNotes] = useState('');

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: '', firstName: '', lastName: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postalCode: '', countryCode: 'SA', phone: '', isDefault: false,
  });

  const token = store.accessToken;

  useEffect(() => {
    if (!storeSlug || !token) return;
    loadCheckoutData();
  }, [storeSlug, token]);

  const loadCheckoutData = async () => {
    setLoading(true);
    try {
      const [cartRes, addrRes] = await Promise.all([
        storeApi.getCart(storeSlug, { token }),
        storeApi.getAddresses(storeSlug, { token }),
      ]);
      setCart(cartRes.data);
      setAddresses(addrRes.data || []);

      // Auto-select default address
      const defaultAddr = addrRes.data?.find((a: any) => a.is_default);
      if (defaultAddr) setSelectedAddress(defaultAddr.id);
    } catch (error) {
      console.error('Failed to load checkout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.addressLine1 || !newAddress.city) {
      alert('Address and city are required');
      return;
    }
    try {
      const result = await storeApi.addAddress(storeSlug, newAddress, { token });
      setAddresses(prev => [...prev, result.data]);
      setSelectedAddress(result.data.id);
      setShowAddressForm(false);
      setNewAddress({
        label: '', firstName: '', lastName: '', addressLine1: '', addressLine2: '',
        city: '', state: '', postalCode: '', countryCode: 'SA', phone: '', isDefault: false,
      });
    } catch (error: any) {
      alert(error.message || 'Failed to add address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a shipping address');
      return;
    }
    setSubmitting(true);
    try {
      const result = await storeApi.checkout(storeSlug, {
        shippingAddressId: selectedAddress,
        billingAddressId: selectedAddress,
        paymentMethod,
        shippingMethod: selectedShipping,
        notes,
      }, { token });

      // Redirect to order confirmation
      router.push(`/store/${storeSlug}/orders?new=${result.data?.id || ''}`);
    } catch (error: any) {
      alert(error.message || 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    router.push(`/store/${storeSlug}/login?redirect=${encodeURIComponent(router.asPath)}`);
    return null;
  }

  const steps: { key: CheckoutStep; label: string; icon: any }[] = [
    { key: 'address', label: 'Address', icon: MapPinIcon },
    { key: 'shipping', label: 'Shipping', icon: TruckIcon },
    { key: 'payment', label: 'Payment', icon: CreditCardIcon },
    { key: 'review', label: 'Review', icon: CheckCircleIcon },
  ];

  const stepIndex = steps.findIndex(s => s.key === step);
  const items = cart?.items || [];

  return (
    <>
      <Head>
        <title>Checkout — Store</title>
      </Head>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center">
            <button
              onClick={() => idx <= stepIndex && setStep(s.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                idx <= stepIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 ${idx < stepIndex ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />)}
            </div>
          ) : (
            <>
              {/* Step 1: Address */}
              {step === 'address' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shipping Address</h2>

                  {addresses.map((addr: any) => (
                    <label
                      key={addr.id}
                      className={`block p-4 border rounded-xl cursor-pointer transition-colors ${
                        selectedAddress === addr.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress === addr.id}
                          onChange={() => setSelectedAddress(addr.id)}
                          className="mt-1 text-indigo-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {addr.first_name} {addr.last_name} {addr.label && `(${addr.label})`}
                          </p>
                          <p className="text-sm text-gray-500">{addr.address_line1}</p>
                          {addr.address_line2 && <p className="text-sm text-gray-500">{addr.address_line2}</p>}
                          <p className="text-sm text-gray-500">{addr.city}, {addr.country_code} {addr.postal_code}</p>
                          {addr.phone && <p className="text-sm text-gray-500">{addr.phone}</p>}
                        </div>
                      </div>
                    </label>
                  ))}

                  {showAddressForm ? (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">New Address</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="First Name" value={newAddress.firstName} onChange={e => setNewAddress(p => ({...p, firstName: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                        <input placeholder="Last Name" value={newAddress.lastName} onChange={e => setNewAddress(p => ({...p, lastName: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                      </div>
                      <input placeholder="Address Line 1 *" value={newAddress.addressLine1} onChange={e => setNewAddress(p => ({...p, addressLine1: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                      <input placeholder="Address Line 2" value={newAddress.addressLine2} onChange={e => setNewAddress(p => ({...p, addressLine2: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                      <div className="grid grid-cols-3 gap-3">
                        <input placeholder="City *" value={newAddress.city} onChange={e => setNewAddress(p => ({...p, city: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                        <input placeholder="State" value={newAddress.state} onChange={e => setNewAddress(p => ({...p, state: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                        <input placeholder="Postal Code" value={newAddress.postalCode} onChange={e => setNewAddress(p => ({...p, postalCode: e.target.value}))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                      </div>
                      <input placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress(p => ({...p, phone: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700" />
                      <div className="flex gap-2">
                        <button onClick={handleAddAddress} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">Save Address</button>
                        <button onClick={() => setShowAddressForm(false)} className="px-4 py-2 text-gray-500 text-sm">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors w-full"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Add New Address
                    </button>
                  )}

                  <button
                    onClick={() => setStep('shipping')}
                    disabled={!selectedAddress}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    Continue to Shipping
                  </button>
                </div>
              )}

              {/* Step 2: Shipping */}
              {step === 'shipping' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shipping Method</h2>

                  {[
                    { id: 'standard', name: 'Standard Shipping', desc: '5-7 business days', price: 'Free' },
                    { id: 'express', name: 'Express Shipping', desc: '2-3 business days', price: 'SAR 25.00' },
                    { id: 'next_day', name: 'Next Day Delivery', desc: '1 business day', price: 'SAR 50.00' },
                  ].map(method => (
                    <label
                      key={method.id}
                      className={`block p-4 border rounded-xl cursor-pointer transition-colors ${
                        selectedShipping === method.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            checked={selectedShipping === method.id}
                            onChange={() => setSelectedShipping(method.id)}
                            className="text-indigo-600"
                          />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.desc}</p>
                          </div>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{method.price}</span>
                      </div>
                    </label>
                  ))}

                  <button
                    onClick={() => setStep('payment')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Continue to Payment
                  </button>
                </div>
              )}

              {/* Step 3: Payment */}
              {step === 'payment' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Payment Method</h2>

                  {[
                    { id: 'cod', name: 'Cash on Delivery', desc: 'Pay when you receive your order' },
                    { id: 'bank_transfer', name: 'Bank Transfer', desc: 'Transfer to our bank account' },
                    { id: 'credit_card', name: 'Credit/Debit Card', desc: 'Visa, MasterCard, Mada' },
                  ].map(method => (
                    <label
                      key={method.id}
                      className={`block p-4 border rounded-xl cursor-pointer transition-colors ${
                        paymentMethod === method.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="text-indigo-600"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
                          <p className="text-sm text-gray-500">{method.desc}</p>
                        </div>
                      </div>
                    </label>
                  ))}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Notes (optional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700"
                      placeholder="Special instructions for your order..."
                    />
                  </div>

                  <button
                    onClick={() => setStep('review')}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Review Order
                  </button>
                </div>
              )}

              {/* Step 4: Review & Place Order */}
              {step === 'review' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Review Your Order</h2>

                  {/* Selected Address */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Shipping Address</h3>
                    {(() => {
                      const addr = addresses.find((a: any) => a.id === selectedAddress);
                      return addr ? (
                        <p className="text-sm text-gray-900 dark:text-white">
                          {addr.first_name} {addr.last_name}<br />
                          {addr.address_line1}<br />
                          {addr.city}, {addr.country_code} {addr.postal_code}
                        </p>
                      ) : <p className="text-sm text-gray-500">No address selected</p>;
                    })()}
                  </div>

                  {/* Cart Items */}
                  <div className="space-y-3">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(item.totalPrice || item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={submitting}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-lg rounded-lg transition-colors"
                  >
                    {submitting ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Items ({items.length})</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cart?.subtotal || 0)}
                </span>
              </div>
              {cart?.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cart.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium text-green-600">Free</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(cart?.total || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CheckoutPageWrapper() {
  const router = useRouter();
  const { storeSlug } = router.query as { storeSlug: string };
  if (!storeSlug) return null;

  return (
    <StoreLayout storeSlug={storeSlug}>
      <CheckoutPage />
    </StoreLayout>
  );
}
