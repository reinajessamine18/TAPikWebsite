
import React from 'react'
import KeychainPreview from '../components/KeychainPreview'
import { estimateShipping } from '../lib/pricing'
import addButton from '../assets/addbutton.png'
import minusButton from '../assets/minusbutton.png'

const money = (amount) =>
  `₱${(Number(amount) || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function Cart({ cart, setCart, setPage }) {
  const updateQty = (id, delta) => {
    setCart((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              qty: Math.max(1, (Number(item.qty) || 1) + delta),
            }
          : item
      )
    )
  }

  const remove = (id) => {
    setCart((previous) => previous.filter((item) => item.id !== id))
  }

  const subtotal = cart.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.qty) || 1),
    0
  )

  const weight = cart.reduce(
    (sum, item) =>
      sum + (Number(item.weightGrams) || 50) * (Number(item.qty) || 1),
    0
  )

  const shipping = cart.length ? estimateShipping(weight) : 0
  const total = subtotal + shipping
  const totalItems = cart.reduce(
    (sum, item) => sum + (Number(item.qty) || 1),
    0
  )

  if (cart.length === 0) {
    return (
      <section className="tapik-cart-page">
        <div className="tapik-empty-cart">
          <div className="tapik-empty-icon">♡</div>
          <h1>Your Cart Is Empty</h1>
          <p>
            Your next favorite anik-anik starts with a custom TAPik keychain.
          </p>
          <button
            type="button"
            className="tapik-primary-button"
            onClick={() => setPage('customize')}
          >
            Start Customizing
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="tapik-cart-page">
      <div className="tapik-cart-container">
        <div className="tapik-cart-heading">
          <div>
            <p className="tapik-eyebrow">YOUR TAPik ORDER</p>
            <h1>Shopping Cart</h1>
            <p className="tapik-cart-subtitle">
              Review your personalized keychains before checkout.
            </p>
          </div>

          <span className="tapik-item-count">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="tapik-cart-layout">
          <div className="tapik-cart-items">
            <div className="tapik-panel-heading">
              <h2>Your Items</h2>
              <span>{cart.length} product{cart.length !== 1 ? 's' : ''}</span>
            </div>

            {cart.map((item) => (
              <article className="tapik-cart-item" key={item.id}>
                <div className="tapik-cart-product-image">
                  <KeychainPreview
                    shape={item.shape}
                    chain={item.chain}
                    image={item.image}
                  />
                </div>

                <div className="tapik-cart-product-details">
                  <h3>Custom TAPik Keychain</h3>

                  <p className="tapik-product-description">
                    Personalized acrylic keychain with NFC customization.
                  </p>

                  <div className="tapik-product-tags">
                    <span>{item.shape || 'Rectangle'}</span>
                    <span>{item.chain || 'Gold'} finish</span>
                    <span>NFC</span>
                  </div>

                  <div className="tapik-quantity-row">
                    <span className="tapik-quantity-label">Quantity</span>

                    <div className="tapik-quantity-control">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, -1)}
                        disabled={(Number(item.qty) || 1) <= 1}
                        aria-label="Decrease quantity"
                        className="tapik-quantity-button"
                      >
                        <img src={minusButton} alt="" />
                      </button>

                      <span className="tapik-quantity-value">
                        {Number(item.qty) || 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQty(item.id, 1)}
                        aria-label="Increase quantity"
                        className="tapik-quantity-button"
                      >
                        <img src={addButton} alt="" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="tapik-remove-button"
                    onClick={() => remove(item.id)}
                  >
                    Remove item
                  </button>
                </div>

                <div className="tapik-cart-line-price">
                  <span>Item total</span>
                  <strong>
                    {money(
                      (Number(item.price) || 0) * (Number(item.qty) || 1)
                    )}
                  </strong>
                  <small>{money(item.price)} / piece</small>
                </div>
              </article>
            ))}

            <button
              type="button"
              className="tapik-continue-button"
              onClick={() => setPage('customize')}
            >
              ← Continue shopping
            </button>
          </div>

          <aside className="tapik-order-summary">
            <h2>Price Breakdown</h2>
            <p className="tapik-summary-caption">
              Your order at a glance
            </p>

            <div className="tapik-summary-section">
              <h3>Products</h3>

              {cart.map((item) => (
                <div className="tapik-summary-line" key={item.id}>
                  <span>
                    Keychain × {Number(item.qty) || 1}
                  </span>
                  <strong>
                    {money(
                      (Number(item.price) || 0) * (Number(item.qty) || 1)
                    )}
                  </strong>
                </div>
              ))}
            </div>

            <div className="tapik-summary-section">
              <h3>Delivery</h3>

              <div className="tapik-summary-line">
                <span>Estimated shipping</span>
                <strong>{money(shipping)}</strong>
              </div>

              <p className="tapik-shipping-note">
                Estimated package weight: {(weight / 1000).toFixed(2)} kg.
                Final delivery charges may vary.
              </p>
            </div>

            <div className="tapik-summary-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <button
              type="button"
              className="tapik-primary-button tapik-checkout-button"
              onClick={() => setPage('checkout')}
            >
              Proceed to Checkout
              <span aria-hidden="true"> →</span>
            </button>

            <div className="tapik-checkout-note">
              <span aria-hidden="true">✓</span>
              Review your delivery details at checkout.
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
