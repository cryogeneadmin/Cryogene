# Admin Guide

This guide explains how to use the admin interface at `/admin`. You access it by signing in with your admin account and navigating to `/admin`.

---

## Dashboard

The dashboard shows four headline statistics at a glance:

- **Open orders** — orders that are in `pending` or `paid` status and need action
- **Low stock alerts** — variants with 5 or fewer units remaining
- **New enquiries** — contact form submissions you haven't yet replied to
- **Revenue (last 10 orders)** — total value of your ten most recent paid orders

Below the stat cards, the Recent Orders table shows your latest 10 orders with status, customer name, and total. Click an order number to open the full order detail. [SCREENSHOT: Admin dashboard]

---

## Products

Navigate to `/admin/products` to see all products. You can filter by status (active/inactive) and by category. [SCREENSHOT: Products list with filters]

### Adding a new product

Click "Add product" in the top right. The product form has the following fields:

- **Name** — the display name of the compound (e.g. `BPC-157`)
- **Slug** — the URL path (auto-generated from name; you can edit it)
- **Category** — Peptides, Mixers, or Supplies
- **Short description** — 1-2 sentences shown on the product listing card
- **Full description** — longer text shown on the product detail page
- **CAS Number, Molecular Formula, Molecular Weight, Purity, Testing Method** — chemistry fields shown in the product chemistry row
- **Variants** — at least one variant is required. Each variant has a SKU, size (e.g. `5mg`), pack size (optional), price in pence (e.g. `4999` for £49.99), stock count, and optional COA URL
- **Images** — image URLs for product photos
- **SEO Title and Description** — optional overrides for the page title and meta description. Leave blank to use the product name and short description.
- **FAQ** — optional Q&A pairs shown in the FAQ accordion on the product page

Click Save. The product will appear on the storefront immediately. [SCREENSHOT: Product form]

### Editing a product

Click the product name in the products list to open the edit form. Make your changes and click Save. The storefront will reflect the changes immediately (Next.js cache is revalidated on save). [SCREENSHOT: Product edit form]

### Deactivating a product or variant

To hide a product from the storefront, toggle the Active switch in the products list. The product will no longer appear in listings or search, but the data is not deleted. To deactivate a specific variant (without hiding the whole product), open the product edit form and uncheck the Active checkbox next to that variant.

---

## Orders

Navigate to `/admin/orders` to see all orders. You can filter by status. [SCREENSHOT: Orders list]

### Viewing an order

Click an order number to see the full order detail. The order detail page shows:

- Customer name, email, address, and phone
- Research use confirmation and age gate timestamp
- All items ordered, with SKU, size, quantity, and line total
- Subtotal, shipping, VAT, and grand total
- Payment status and reference
- Fulfilment status (carrier, tracking number, dispatch date)
- Admin notes

### Transitioning order status

Use the status buttons at the top of the order detail page to move an order through its lifecycle:

1. **Pending** → order received, payment not yet confirmed
2. **Paid** → payment confirmed, ready to fulfil
3. **Fulfilled** → order dispatched (add tracking number before marking as fulfilled)
4. **Cancelled** → order cancelled (use with caution; refund separately if needed)
5. **Refunded** → refund issued

[SCREENSHOT: Order status controls]

### Adding admin notes

Use the Notes section at the bottom of the order detail page to add internal notes. These are not visible to the customer. Useful for recording calls, special handling instructions, or dispatch exceptions.

---

## Enquiries

Navigate to `/admin/enquiries` to see contact form submissions. Each enquiry shows the customer name, email, subject, message, and date. [SCREENSHOT: Enquiries list]

To reply, click the email address — this opens your email client with the address pre-filled. After replying, mark the enquiry as Replied using the status button. Enquiries you have marked as replied are hidden from the default view but remain in the system.

---

## Customers

Navigate to `/admin/customers` to see all registered customers. The list shows each customer's name, email, order count, and lifetime value. Click a customer to see their contact details and order history. [SCREENSHOT: Customers list]

---

## Settings

Navigate to `/admin/settings` to configure your store. Changes take effect immediately across the whole site (the navbar and footer update on the next page load). [SCREENSHOT: Settings form]

Sections:

- **Store identity** — store name, email, phone, registered address, company number, VAT number
- **VAT** — toggle VAT registration status, set the rate, choose whether prices display inclusive or exclusive
- **Shipping** — flat shipping rate in pence (e.g. `395` for £3.95), free shipping threshold in pence (leave blank for no free threshold), estimated dispatch message
- **Notifications** — the email address that receives new order notifications
