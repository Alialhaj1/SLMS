--
-- PostgreSQL database dump
--

\restrict hlII8VS8ceMyMZSVjpKgjs98LIBmghMBrdRLEtg6iSB3UbKATk6cNutke43ofRY

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: customs_declarations; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.customs_declarations (
    id integer NOT NULL,
    company_id integer NOT NULL,
    declaration_number character varying(60) NOT NULL,
    declaration_type_id integer NOT NULL,
    status_id integer NOT NULL,
    declaration_date date DEFAULT CURRENT_DATE NOT NULL,
    submission_date date,
    clearance_date date,
    shipment_id integer,
    purchase_order_id integer,
    commercial_invoice_id integer,
    project_id integer,
    customs_office_code character varying(30),
    customs_office_name character varying(255),
    entry_point_code character varying(30),
    entry_point_name character varying(255),
    transport_mode character varying(30),
    vessel_name character varying(255),
    voyage_number character varying(60),
    bl_number character varying(60),
    awb_number character varying(60),
    manifest_number character varying(60),
    origin_country_id integer,
    destination_country_id integer,
    final_destination character varying(255),
    incoterm character varying(20),
    currency_id integer NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1,
    total_cif_value numeric(18,4) DEFAULT 0,
    total_fob_value numeric(18,4) DEFAULT 0,
    freight_value numeric(18,4) DEFAULT 0,
    insurance_value numeric(18,4) DEFAULT 0,
    other_charges numeric(18,4) DEFAULT 0,
    total_customs_duty numeric(18,4) DEFAULT 0,
    total_vat numeric(18,4) DEFAULT 0,
    total_other_fees numeric(18,4) DEFAULT 0,
    total_fees numeric(18,4) DEFAULT 0,
    total_gross_weight numeric(18,4) DEFAULT 0,
    total_net_weight numeric(18,4) DEFAULT 0,
    total_packages integer DEFAULT 0,
    package_type character varying(50),
    notes text,
    internal_notes text,
    submitted_by integer,
    submitted_at timestamp without time zone,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    approved_by integer,
    approved_at timestamp without time zone,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    port_id integer,
    handling_fees numeric(18,4) DEFAULT 0,
    ground_fees numeric(18,4) DEFAULT 0
);


ALTER TABLE public.customs_declarations OWNER TO slms;

--
-- Name: COLUMN customs_declarations.port_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.customs_declarations.port_id IS 'Reference to the port/entry point';


--
-- Name: COLUMN customs_declarations.handling_fees; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.customs_declarations.handling_fees IS 'Handling fees (رسوم المناولة)';


--
-- Name: COLUMN customs_declarations.ground_fees; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.customs_declarations.ground_fees IS 'Ground fees (رسوم الأرضية)';


--
-- Name: customs_declarations_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.customs_declarations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customs_declarations_id_seq OWNER TO slms;

--
-- Name: customs_declarations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.customs_declarations_id_seq OWNED BY public.customs_declarations.id;


--
-- Name: expense_requests; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.expense_requests (
    id integer NOT NULL,
    company_id integer NOT NULL,
    request_number character varying(50) NOT NULL,
    request_date date DEFAULT CURRENT_DATE NOT NULL,
    requested_by integer NOT NULL,
    department_id integer,
    project_id integer NOT NULL,
    shipment_id integer,
    expense_type_id integer NOT NULL,
    vendor_id integer NOT NULL,
    bl_number character varying(100),
    container_number character varying(50),
    port_of_loading_id integer,
    port_of_discharge_id integer,
    currency_id integer NOT NULL,
    exchange_rate_id integer,
    exchange_rate numeric(18,6) DEFAULT 1 NOT NULL,
    total_amount numeric(18,4) DEFAULT 0 NOT NULL,
    total_amount_local numeric(18,4) DEFAULT 0 NOT NULL,
    status_id integer DEFAULT 1 NOT NULL,
    submitted_at timestamp with time zone,
    submitted_by integer,
    approved_at timestamp with time zone,
    approved_by integer,
    rejected_at timestamp with time zone,
    rejected_by integer,
    rejection_reason text,
    notes text,
    internal_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    deleted_at timestamp with time zone,
    source_type character varying(20) DEFAULT 'manual'::character varying,
    source_shipment_expense_id integer,
    is_auto_synced boolean DEFAULT false,
    accounting_status character varying(20) DEFAULT 'pending'::character varying,
    journal_entry_id integer,
    is_printed boolean DEFAULT false,
    first_printed_at timestamp with time zone,
    first_printed_by integer,
    print_count integer DEFAULT 0,
    last_printed_at timestamp with time zone,
    last_printed_by integer
);


ALTER TABLE public.expense_requests OWNER TO slms;

--
-- Name: TABLE expense_requests; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON TABLE public.expense_requests IS 'Expense requests module (requires permissions: expense_requests:view/create/update/delete/submit/approve/manage)';


--
-- Name: COLUMN expense_requests.source_type; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.source_type IS 'Source of the request: manual, shipment_expense, purchase_invoice';


--
-- Name: COLUMN expense_requests.source_shipment_expense_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.source_shipment_expense_id IS 'Reference to shipment_expenses.id if auto-synced';


--
-- Name: COLUMN expense_requests.is_auto_synced; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.is_auto_synced IS 'True if this request was automatically created from another module';


--
-- Name: COLUMN expense_requests.is_printed; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.is_printed IS 'Whether the request has been printed at least once';


--
-- Name: COLUMN expense_requests.first_printed_at; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.first_printed_at IS 'Timestamp of first print';


--
-- Name: COLUMN expense_requests.first_printed_by; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.first_printed_by IS 'User who first printed the request';


--
-- Name: COLUMN expense_requests.print_count; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.print_count IS 'Number of times the request was printed';


--
-- Name: COLUMN expense_requests.last_printed_at; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.last_printed_at IS 'Timestamp of last print';


--
-- Name: COLUMN expense_requests.last_printed_by; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.expense_requests.last_printed_by IS 'User who last printed the request';


--
-- Name: expense_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.expense_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.expense_requests_id_seq OWNER TO slms;

--
-- Name: expense_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.expense_requests_id_seq OWNED BY public.expense_requests.id;


--
-- Name: general_ledger; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.general_ledger (
    id integer NOT NULL,
    company_id integer NOT NULL,
    branch_id integer,
    journal_entry_id integer NOT NULL,
    journal_line_id integer NOT NULL,
    account_id integer NOT NULL,
    account_code character varying(20) NOT NULL,
    cost_center_id integer,
    profit_center_id integer,
    project_id integer,
    partner_type character varying(20),
    partner_id integer,
    fiscal_year_id integer NOT NULL,
    period_id integer NOT NULL,
    entry_number character varying(50) NOT NULL,
    entry_date date NOT NULL,
    posting_date date NOT NULL,
    debit_amount numeric(18,4) DEFAULT 0,
    credit_amount numeric(18,4) DEFAULT 0,
    balance numeric(18,4) DEFAULT 0,
    currency_id integer NOT NULL,
    exchange_rate numeric(18,8) DEFAULT 1,
    fc_debit_amount numeric(18,4) DEFAULT 0,
    fc_credit_amount numeric(18,4) DEFAULT 0,
    source_document_type character varying(50),
    source_document_id integer,
    source_document_number character varying(50),
    description text,
    posted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    posted_by integer NOT NULL,
    numbering_series_id integer,
    sequence_no integer
);


ALTER TABLE public.general_ledger OWNER TO slms;

--
-- Name: TABLE general_ledger; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON TABLE public.general_ledger IS 'Posted transactions - immutable record of all accounting movements';


--
-- Name: general_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.general_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.general_ledger_id_seq OWNER TO slms;

--
-- Name: general_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.general_ledger_id_seq OWNED BY public.general_ledger.id;


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.journal_entries (
    id integer NOT NULL,
    company_id integer NOT NULL,
    branch_id integer,
    entry_number character varying(50) NOT NULL,
    entry_date date NOT NULL,
    posting_date date,
    fiscal_year_id integer NOT NULL,
    period_id integer NOT NULL,
    entry_type character varying(50) DEFAULT 'manual'::character varying NOT NULL,
    source_document_type character varying(50),
    source_document_id integer,
    source_document_number character varying(50),
    is_reversal boolean DEFAULT false,
    reversed_entry_id integer,
    reversal_entry_id integer,
    reversal_date date,
    reversal_reason text,
    currency_id integer NOT NULL,
    exchange_rate numeric(18,8) DEFAULT 1,
    total_debit numeric(18,4) DEFAULT 0 NOT NULL,
    total_credit numeric(18,4) DEFAULT 0 NOT NULL,
    total_debit_fc numeric(18,4) DEFAULT 0,
    total_credit_fc numeric(18,4) DEFAULT 0,
    status public.document_status DEFAULT 'draft'::public.document_status NOT NULL,
    description text,
    narration text,
    reference character varying(100),
    submitted_by integer,
    submitted_at timestamp with time zone,
    approved_by integer,
    approved_at timestamp with time zone,
    approval_notes text,
    posted_by integer,
    posted_at timestamp with time zone,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by integer,
    updated_at timestamp with time zone,
    numbering_series_id integer,
    sequence_no integer,
    is_reversed boolean DEFAULT false,
    reversed_by integer,
    reversed_at timestamp with time zone,
    reversal_of integer,
    CONSTRAINT chk_journal_balanced CHECK (((status = 'draft'::public.document_status) OR (total_debit = total_credit)))
);


ALTER TABLE public.journal_entries OWNER TO slms;

--
-- Name: TABLE journal_entries; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON TABLE public.journal_entries IS 'Header table for all accounting journal entries';


--
-- Name: COLUMN journal_entries.is_reversed; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.journal_entries.is_reversed IS 'Whether this entry has been reversed';


--
-- Name: COLUMN journal_entries.reversed_by; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.journal_entries.reversed_by IS 'The reversal journal entry ID';


--
-- Name: COLUMN journal_entries.reversed_at; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.journal_entries.reversed_at IS 'When this entry was reversed';


--
-- Name: COLUMN journal_entries.reversal_of; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.journal_entries.reversal_of IS 'The original entry this reverses';


--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.journal_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.journal_entries_id_seq OWNER TO slms;

--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.journal_entries_id_seq OWNED BY public.journal_entries.id;


--
-- Name: purchase_invoices; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.purchase_invoices (
    id integer NOT NULL,
    company_id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    vendor_id integer NOT NULL,
    vendor_code character varying(50),
    vendor_name character varying(200),
    vendor_invoice_number character varying(50),
    vendor_invoice_date date,
    purchase_order_id integer,
    goods_receipt_id integer,
    currency_id integer,
    exchange_rate numeric(18,6) DEFAULT 1,
    payment_terms_id integer,
    subtotal numeric(18,4) DEFAULT 0,
    discount_amount numeric(18,4) DEFAULT 0,
    tax_amount numeric(18,4) DEFAULT 0,
    freight_amount numeric(18,4) DEFAULT 0,
    total_amount numeric(18,4) DEFAULT 0,
    paid_amount numeric(18,4) DEFAULT 0,
    balance numeric(18,4) DEFAULT 0,
    status character varying(20) DEFAULT 'draft'::character varying,
    journal_entry_id integer,
    cost_center_id integer,
    notes text,
    created_by integer,
    updated_by integer,
    posted_by integer,
    posted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    is_posted boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    approved_at timestamp without time zone,
    is_reversed boolean DEFAULT false,
    reversed_at timestamp without time zone,
    reversal_reason text,
    approved_by integer,
    reversed_by integer,
    posting_notes text,
    approval_status character varying(50) DEFAULT 'not_required'::character varying,
    approval_request_id integer,
    invoice_type_id integer,
    posting_date date,
    description text,
    internal_notes text,
    withholding_tax_rate numeric(8,4) DEFAULT 0,
    withholding_tax_amount numeric(18,4) DEFAULT 0,
    expected_payment_date date,
    cheque_number character varying(100),
    cheque_date date,
    bank_account_id integer,
    cash_box_id integer,
    CONSTRAINT prevent_delete_posted_invoice CHECK (((is_posted = false) OR ((is_posted = true) AND (deleted_at IS NULL))))
);


ALTER TABLE public.purchase_invoices OWNER TO slms;

--
-- Name: COLUMN purchase_invoices.due_date; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_invoices.due_date IS 'Calculated on posting: invoice_date + payment_term_days. Used for accurate aging.';


--
-- Name: CONSTRAINT prevent_delete_posted_invoice ON purchase_invoices; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON CONSTRAINT prevent_delete_posted_invoice ON public.purchase_invoices IS 'Posted invoices cannot be deleted (soft delete blocked)';


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.purchase_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.purchase_invoices_id_seq OWNER TO slms;

--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.purchase_invoices_id_seq OWNED BY public.purchase_invoices.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    company_id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    order_date date NOT NULL,
    expected_date date,
    vendor_id integer NOT NULL,
    vendor_code character varying(50),
    vendor_name character varying(200),
    order_type_id integer,
    contract_id integer,
    quotation_id integer,
    warehouse_id integer,
    currency_id integer,
    exchange_rate numeric(18,6) DEFAULT 1,
    payment_terms_id integer,
    delivery_terms_id integer,
    supply_terms_id integer,
    subtotal numeric(18,4) DEFAULT 0,
    discount_amount numeric(18,4) DEFAULT 0,
    tax_amount numeric(18,4) DEFAULT 0,
    freight_amount numeric(18,4) DEFAULT 0,
    total_amount numeric(18,4) DEFAULT 0,
    received_amount numeric(18,4) DEFAULT 0,
    invoiced_amount numeric(18,4) DEFAULT 0,
    status_id integer,
    status character varying(20) DEFAULT 'draft'::character varying,
    requires_approval boolean DEFAULT true,
    approved_by integer,
    approved_at timestamp without time zone,
    ship_to_address text,
    notes text,
    internal_notes text,
    cost_center_id integer,
    created_by integer,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    is_posted boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    posted_at timestamp without time zone,
    is_reversed boolean DEFAULT false,
    reversed_at timestamp without time zone,
    reversal_reason text,
    posted_by integer,
    reversed_by integer,
    incoterm_id integer,
    approval_status character varying(50) DEFAULT 'not_required'::character varying,
    approval_request_id integer,
    vendor_contract_number character varying(50),
    vendor_contract_date date,
    payment_method_id integer,
    project_id integer,
    origin_country_id integer,
    origin_city_id integer,
    destination_country_id integer DEFAULT 1,
    destination_city_id integer,
    port_of_loading_id integer,
    port_of_loading_text character varying(200),
    port_of_discharge_id integer
);


ALTER TABLE public.purchase_orders OWNER TO slms;

--
-- Name: COLUMN purchase_orders.deleted_at; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.deleted_at IS 'Soft delete timestamp. Super_admin and admin can delete any order (checked in application layer).';


--
-- Name: COLUMN purchase_orders.payment_method_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.payment_method_id IS 'Payment method from master data (replaces payment_terms for method tracking)';


--
-- Name: COLUMN purchase_orders.project_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.project_id IS 'Project linkage - required for PO approval workflow';


--
-- Name: COLUMN purchase_orders.origin_country_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.origin_country_id IS 'Country where goods are being shipped from';


--
-- Name: COLUMN purchase_orders.origin_city_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.origin_city_id IS 'City where goods are being shipped from';


--
-- Name: COLUMN purchase_orders.destination_country_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.destination_country_id IS 'Country where goods are being shipped to (defaults to Saudi Arabia)';


--
-- Name: COLUMN purchase_orders.destination_city_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.destination_city_id IS 'City where goods are being shipped to (within Saudi Arabia)';


--
-- Name: COLUMN purchase_orders.port_of_loading_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.port_of_loading_id IS 'Port where goods will be loaded (if Saudi port, otherwise use port_of_loading_text)';


--
-- Name: COLUMN purchase_orders.port_of_loading_text; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.port_of_loading_text IS 'Free text for international ports not in ports table';


--
-- Name: COLUMN purchase_orders.port_of_discharge_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.purchase_orders.port_of_discharge_id IS 'Saudi port/airport where goods will arrive (required for shipments)';


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.purchase_orders_id_seq OWNER TO slms;

--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.sales_invoices (
    id integer NOT NULL,
    company_id integer NOT NULL,
    branch_id integer,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    customer_id integer NOT NULL,
    customer_code character varying(50),
    customer_name character varying(200),
    customer_name_ar character varying(200),
    tax_registration_number character varying(50),
    billing_address text,
    shipping_address text,
    status_id integer,
    status character varying(30) DEFAULT 'DRAFT'::character varying,
    sales_order_id integer,
    order_number character varying(50),
    delivery_note_id integer,
    delivery_number character varying(50),
    currency_id integer,
    exchange_rate numeric(18,6) DEFAULT 1,
    subtotal numeric(18,2) DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(18,2) DEFAULT 0,
    tax_amount numeric(18,2) DEFAULT 0,
    freight_amount numeric(18,2) DEFAULT 0,
    total_amount numeric(18,2) DEFAULT 0,
    paid_amount numeric(18,2) DEFAULT 0,
    balance_due numeric(18,2) GENERATED ALWAYS AS ((total_amount - paid_amount)) STORED,
    payment_terms_id integer,
    posted boolean DEFAULT false,
    posted_at timestamp with time zone,
    posted_by integer,
    journal_entry_id integer,
    receivable_account_id integer,
    revenue_account_id integer,
    notes text,
    internal_notes text,
    sales_rep_id integer,
    cost_center_id integer,
    approved_by integer,
    approved_at timestamp with time zone,
    voided boolean DEFAULT false,
    voided_by integer,
    voided_at timestamp with time zone,
    void_reason text,
    einvoice_uuid character varying(100),
    einvoice_hash character varying(500),
    einvoice_qr text,
    einvoice_submitted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer,
    deleted_at timestamp with time zone
);


ALTER TABLE public.sales_invoices OWNER TO slms;

--
-- Name: sales_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.sales_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_invoices_id_seq OWNER TO slms;

--
-- Name: sales_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.sales_invoices_id_seq OWNED BY public.sales_invoices.id;


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.sales_orders (
    id integer NOT NULL,
    company_id integer NOT NULL,
    branch_id integer,
    order_number character varying(50) NOT NULL,
    order_date date NOT NULL,
    requested_delivery_date date,
    promised_delivery_date date,
    customer_id integer NOT NULL,
    customer_code character varying(50),
    customer_name character varying(200),
    customer_name_ar character varying(200),
    customer_po_number character varying(100),
    billing_address text,
    shipping_address text,
    status_id integer,
    status character varying(30) DEFAULT 'DRAFT'::character varying,
    quotation_id integer,
    quotation_number character varying(50),
    credit_check_passed boolean,
    credit_check_result jsonb,
    credit_approved_by integer,
    credit_approved_at timestamp with time zone,
    credit_override_reason text,
    currency_id integer,
    exchange_rate numeric(18,6) DEFAULT 1,
    price_list_id integer,
    subtotal numeric(18,2) DEFAULT 0,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(18,2) DEFAULT 0,
    tax_amount numeric(18,2) DEFAULT 0,
    freight_amount numeric(18,2) DEFAULT 0,
    total_amount numeric(18,2) DEFAULT 0,
    total_qty_ordered numeric(18,6) DEFAULT 0,
    total_qty_delivered numeric(18,6) DEFAULT 0,
    total_qty_invoiced numeric(18,6) DEFAULT 0,
    delivery_status character varying(30) DEFAULT 'PENDING'::character varying,
    invoice_status character varying(30) DEFAULT 'PENDING'::character varying,
    payment_terms_id integer,
    delivery_terms character varying(100),
    warehouse_id integer,
    notes text,
    internal_notes text,
    sales_rep_id integer,
    cost_center_id integer,
    approved_by integer,
    approved_at timestamp with time zone,
    confirmed_by integer,
    confirmed_at timestamp with time zone,
    cancelled_by integer,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer,
    deleted_at timestamp with time zone
);


ALTER TABLE public.sales_orders OWNER TO slms;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.sales_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_orders_id_seq OWNER TO slms;

--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.shipments (
    id integer NOT NULL,
    supplier_id integer,
    tracking_number text,
    status text DEFAULT 'created'::text,
    origin text,
    destination text,
    est_arrival timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    accounting_status character varying(20) DEFAULT 'pending'::character varying
);


ALTER TABLE public.shipments OWNER TO slms;

--
-- Name: shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shipments_id_seq OWNER TO slms;

--
-- Name: shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;


--
-- Name: vendor_payments; Type: TABLE; Schema: public; Owner: slms
--

CREATE TABLE public.vendor_payments (
    id integer NOT NULL,
    company_id integer NOT NULL,
    vendor_id integer NOT NULL,
    payment_number character varying(50) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) DEFAULT 'bank_transfer'::character varying NOT NULL,
    bank_account_id integer,
    reference_number character varying(100),
    currency_id integer NOT NULL,
    payment_amount numeric(18,4) NOT NULL,
    exchange_rate numeric(18,6) DEFAULT 1.000000,
    base_amount numeric(18,4),
    allocated_amount numeric(18,4) DEFAULT 0,
    unallocated_amount numeric(18,4),
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    is_posted boolean DEFAULT false,
    posted_at timestamp without time zone,
    posted_by integer,
    notes text,
    payment_terms_note text,
    created_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    approved_by integer,
    approved_at timestamp without time zone,
    approval_status character varying(50) DEFAULT 'not_required'::character varying,
    approval_request_id integer,
    purchase_order_id integer,
    shipment_id integer,
    lc_id integer,
    project_id integer,
    quotation_id integer,
    invoice_id integer,
    source_type character varying(50) DEFAULT 'direct'::character varying,
    cash_box_id integer,
    CONSTRAINT check_allocated_not_exceed_payment CHECK ((allocated_amount <= payment_amount)),
    CONSTRAINT posting_integrity CHECK ((((is_posted = false) AND (posted_at IS NULL) AND (posted_by IS NULL)) OR ((is_posted = true) AND (posted_at IS NOT NULL) AND (posted_by IS NOT NULL)))),
    CONSTRAINT prevent_delete_posted_payment CHECK (((is_posted = false) OR ((is_posted = true) AND (deleted_at IS NULL)))),
    CONSTRAINT valid_unallocated CHECK ((unallocated_amount >= (0)::numeric)),
    CONSTRAINT vendor_payments_payment_amount_check CHECK ((payment_amount > (0)::numeric))
);


ALTER TABLE public.vendor_payments OWNER TO slms;

--
-- Name: TABLE vendor_payments; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON TABLE public.vendor_payments IS 'Vendor payment transactions with posting and allocation tracking';


--
-- Name: COLUMN vendor_payments.payment_method; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.payment_method IS 'bank_transfer, check, cash, wire_transfer, credit_card';


--
-- Name: COLUMN vendor_payments.base_amount; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.base_amount IS 'Payment amount in company base currency (for multi-currency)';


--
-- Name: COLUMN vendor_payments.unallocated_amount; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.unallocated_amount IS 'Auto-calculated: payment_amount - allocated_amount';


--
-- Name: COLUMN vendor_payments.is_posted; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.is_posted IS 'Posted payments affect vendor balance and aging';


--
-- Name: COLUMN vendor_payments.purchase_order_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.purchase_order_id IS 'Link to purchase order being paid';


--
-- Name: COLUMN vendor_payments.shipment_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.shipment_id IS 'Link to shipment being paid';


--
-- Name: COLUMN vendor_payments.lc_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.lc_id IS 'Link to letter of credit used for payment';


--
-- Name: COLUMN vendor_payments.project_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.project_id IS 'Link to project (usually from shipment)';


--
-- Name: COLUMN vendor_payments.quotation_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.quotation_id IS 'Link to vendor quotation being paid';


--
-- Name: COLUMN vendor_payments.invoice_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.invoice_id IS 'Link to purchase invoice being paid';


--
-- Name: COLUMN vendor_payments.source_type; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.source_type IS 'Type of source document: po, shipment, quotation, invoice, lc, direct';


--
-- Name: COLUMN vendor_payments.cash_box_id; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON COLUMN public.vendor_payments.cash_box_id IS 'Link to cash box for cash payments';


--
-- Name: CONSTRAINT prevent_delete_posted_payment ON vendor_payments; Type: COMMENT; Schema: public; Owner: slms
--

COMMENT ON CONSTRAINT prevent_delete_posted_payment ON public.vendor_payments IS 'Posted payments cannot be deleted';


--
-- Name: vendor_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: slms
--

CREATE SEQUENCE public.vendor_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.vendor_payments_id_seq OWNER TO slms;

--
-- Name: vendor_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: slms
--

ALTER SEQUENCE public.vendor_payments_id_seq OWNED BY public.vendor_payments.id;


--
-- Name: customs_declarations id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations ALTER COLUMN id SET DEFAULT nextval('public.customs_declarations_id_seq'::regclass);


--
-- Name: expense_requests id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests ALTER COLUMN id SET DEFAULT nextval('public.expense_requests_id_seq'::regclass);


--
-- Name: general_ledger id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger ALTER COLUMN id SET DEFAULT nextval('public.general_ledger_id_seq'::regclass);


--
-- Name: journal_entries id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN id SET DEFAULT nextval('public.journal_entries_id_seq'::regclass);


--
-- Name: purchase_invoices id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices ALTER COLUMN id SET DEFAULT nextval('public.purchase_invoices_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: sales_invoices id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices ALTER COLUMN id SET DEFAULT nextval('public.sales_invoices_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: shipments id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);


--
-- Name: vendor_payments id; Type: DEFAULT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments ALTER COLUMN id SET DEFAULT nextval('public.vendor_payments_id_seq'::regclass);


--
-- Data for Name: customs_declarations; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.customs_declarations (id, company_id, declaration_number, declaration_type_id, status_id, declaration_date, submission_date, clearance_date, shipment_id, purchase_order_id, commercial_invoice_id, project_id, customs_office_code, customs_office_name, entry_point_code, entry_point_name, transport_mode, vessel_name, voyage_number, bl_number, awb_number, manifest_number, origin_country_id, destination_country_id, final_destination, incoterm, currency_id, exchange_rate, total_cif_value, total_fob_value, freight_value, insurance_value, other_charges, total_customs_duty, total_vat, total_other_fees, total_fees, total_gross_weight, total_net_weight, total_packages, package_type, notes, internal_notes, submitted_by, submitted_at, reviewed_by, reviewed_at, approved_by, approved_at, created_by, updated_by, created_at, updated_at, deleted_at, port_id, handling_fees, ground_fees) FROM stdin;
\.


--
-- Data for Name: expense_requests; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.expense_requests (id, company_id, request_number, request_date, requested_by, department_id, project_id, shipment_id, expense_type_id, vendor_id, bl_number, container_number, port_of_loading_id, port_of_discharge_id, currency_id, exchange_rate_id, exchange_rate, total_amount, total_amount_local, status_id, submitted_at, submitted_by, approved_at, approved_by, rejected_at, rejected_by, rejection_reason, notes, internal_notes, created_at, updated_at, created_by, updated_by, deleted_at, source_type, source_shipment_expense_id, is_auto_synced, accounting_status, journal_entry_id, is_printed, first_printed_at, first_printed_by, print_count, last_printed_at, last_printed_by) FROM stdin;
\.


--
-- Data for Name: general_ledger; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.general_ledger (id, company_id, branch_id, journal_entry_id, journal_line_id, account_id, account_code, cost_center_id, profit_center_id, project_id, partner_type, partner_id, fiscal_year_id, period_id, entry_number, entry_date, posting_date, debit_amount, credit_amount, balance, currency_id, exchange_rate, fc_debit_amount, fc_credit_amount, source_document_type, source_document_id, source_document_number, description, posted_at, posted_by, numbering_series_id, sequence_no) FROM stdin;
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.journal_entries (id, company_id, branch_id, entry_number, entry_date, posting_date, fiscal_year_id, period_id, entry_type, source_document_type, source_document_id, source_document_number, is_reversal, reversed_entry_id, reversal_entry_id, reversal_date, reversal_reason, currency_id, exchange_rate, total_debit, total_credit, total_debit_fc, total_credit_fc, status, description, narration, reference, submitted_by, submitted_at, approved_by, approved_at, approval_notes, posted_by, posted_at, created_by, created_at, updated_by, updated_at, numbering_series_id, sequence_no, is_reversed, reversed_by, reversed_at, reversal_of) FROM stdin;
\.


--
-- Data for Name: purchase_invoices; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.purchase_invoices (id, company_id, invoice_number, invoice_date, due_date, vendor_id, vendor_code, vendor_name, vendor_invoice_number, vendor_invoice_date, purchase_order_id, goods_receipt_id, currency_id, exchange_rate, payment_terms_id, subtotal, discount_amount, tax_amount, freight_amount, total_amount, paid_amount, balance, status, journal_entry_id, cost_center_id, notes, created_by, updated_by, posted_by, posted_at, created_at, updated_at, deleted_at, is_posted, is_locked, approved_at, is_reversed, reversed_at, reversal_reason, approved_by, reversed_by, posting_notes, approval_status, approval_request_id, invoice_type_id, posting_date, description, internal_notes, withholding_tax_rate, withholding_tax_amount, expected_payment_date, cheque_number, cheque_date, bank_account_id, cash_box_id) FROM stdin;
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.purchase_orders (id, company_id, order_number, order_date, expected_date, vendor_id, vendor_code, vendor_name, order_type_id, contract_id, quotation_id, warehouse_id, currency_id, exchange_rate, payment_terms_id, delivery_terms_id, supply_terms_id, subtotal, discount_amount, tax_amount, freight_amount, total_amount, received_amount, invoiced_amount, status_id, status, requires_approval, approved_by, approved_at, ship_to_address, notes, internal_notes, cost_center_id, created_by, updated_by, created_at, updated_at, deleted_at, is_posted, is_locked, posted_at, is_reversed, reversed_at, reversal_reason, posted_by, reversed_by, incoterm_id, approval_status, approval_request_id, vendor_contract_number, vendor_contract_date, payment_method_id, project_id, origin_country_id, origin_city_id, destination_country_id, destination_city_id, port_of_loading_id, port_of_loading_text, port_of_discharge_id) FROM stdin;
1	1	PO-2026-0001	2026-02-01	\N	637	2201100	HISAN CARDAMOM	2	\N	\N	\N	3	1.000000	\N	3	\N	615000.0000	0.0000	0.0000	0.0000	615000.0000	0.0000	0.0000	1	draft	t	\N	\N	\N		\N	\N	2	\N	2026-02-01 09:10:38.167282	2026-02-01 09:10:38.167282	\N	f	f	\N	f	\N	\N	\N	\N	\N	not_required	\N	C01 2025/2026	\N	2	64	91	94	1	2	\N	\N	1
\.


--
-- Data for Name: sales_invoices; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.sales_invoices (id, company_id, branch_id, invoice_number, invoice_date, due_date, customer_id, customer_code, customer_name, customer_name_ar, tax_registration_number, billing_address, shipping_address, status_id, status, sales_order_id, order_number, delivery_note_id, delivery_number, currency_id, exchange_rate, subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount, paid_amount, payment_terms_id, posted, posted_at, posted_by, journal_entry_id, receivable_account_id, revenue_account_id, notes, internal_notes, sales_rep_id, cost_center_id, approved_by, approved_at, voided, voided_by, voided_at, void_reason, einvoice_uuid, einvoice_hash, einvoice_qr, einvoice_submitted_at, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.sales_orders (id, company_id, branch_id, order_number, order_date, requested_delivery_date, promised_delivery_date, customer_id, customer_code, customer_name, customer_name_ar, customer_po_number, billing_address, shipping_address, status_id, status, quotation_id, quotation_number, credit_check_passed, credit_check_result, credit_approved_by, credit_approved_at, credit_override_reason, currency_id, exchange_rate, price_list_id, subtotal, discount_percent, discount_amount, tax_amount, freight_amount, total_amount, total_qty_ordered, total_qty_delivered, total_qty_invoiced, delivery_status, invoice_status, payment_terms_id, delivery_terms, warehouse_id, notes, internal_notes, sales_rep_id, cost_center_id, approved_by, approved_at, confirmed_by, confirmed_at, cancelled_by, cancelled_at, cancellation_reason, created_at, updated_at, created_by, updated_by, deleted_at) FROM stdin;
\.


--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.shipments (id, supplier_id, tracking_number, status, origin, destination, est_arrival, notes, created_at, updated_at, accounting_status) FROM stdin;
\.


--
-- Data for Name: vendor_payments; Type: TABLE DATA; Schema: public; Owner: slms
--

COPY public.vendor_payments (id, company_id, vendor_id, payment_number, payment_date, payment_method, bank_account_id, reference_number, currency_id, payment_amount, exchange_rate, base_amount, allocated_amount, unallocated_amount, status, is_posted, posted_at, posted_by, notes, payment_terms_note, created_by, updated_by, created_at, updated_at, deleted_at, approved_by, approved_at, approval_status, approval_request_id, purchase_order_id, shipment_id, lc_id, project_id, quotation_id, invoice_id, source_type, cash_box_id) FROM stdin;
1	1	637	PAY-000001	2026-02-01	bank_transfer	\N		3	307500.0000	1.000000	307500.0000	0.0000	307500.0000	posted	t	2026-02-01 09:22:17.994659	2	دفعة للمورد HISAN CARDAMOM مقابل شحنة رقم SHP-2026-0001 - مشروع رقم 119001	\N	2	\N	2026-02-01 09:22:13.687799	2026-02-01 09:22:17.994659	\N	\N	\N	not_required	\N	\N	1	\N	64	\N	\N	shipment	\N
2	1	637	PAY-000002	2026-02-01	bank_transfer	\N		3	307500.0000	1.000000	307500.0000	0.0000	307500.0000	posted	t	2026-02-01 09:23:24.07904	2	دفعة للمورد HISAN CARDAMOM مقابل شحنة رقم SHP-2026-0001 - مشروع رقم 119001	\N	2	\N	2026-02-01 09:23:20.769435	2026-02-01 09:23:24.07904	\N	\N	\N	not_required	\N	\N	1	\N	64	\N	\N	shipment	\N
\.


--
-- Name: customs_declarations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.customs_declarations_id_seq', 1, false);


--
-- Name: expense_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.expense_requests_id_seq', 1, false);


--
-- Name: general_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.general_ledger_id_seq', 1, false);


--
-- Name: journal_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.journal_entries_id_seq', 1, false);


--
-- Name: purchase_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.purchase_invoices_id_seq', 1, false);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.purchase_orders_id_seq', 1, true);


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.sales_invoices_id_seq', 1, false);


--
-- Name: sales_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.sales_orders_id_seq', 1, false);


--
-- Name: shipments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.shipments_id_seq', 1, false);


--
-- Name: vendor_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: slms
--

SELECT pg_catalog.setval('public.vendor_payments_id_seq', 2, true);


--
-- Name: customs_declarations customs_declarations_company_id_declaration_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_company_id_declaration_number_key UNIQUE (company_id, declaration_number);


--
-- Name: customs_declarations customs_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_pkey PRIMARY KEY (id);


--
-- Name: expense_requests expense_requests_company_id_request_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_company_id_request_number_key UNIQUE (company_id, request_number);


--
-- Name: expense_requests expense_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_pkey PRIMARY KEY (id);


--
-- Name: general_ledger general_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_company_id_entry_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_company_id_entry_number_key UNIQUE (company_id, entry_number);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: purchase_invoices purchase_invoices_company_id_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_company_id_invoice_number_key UNIQUE (company_id, invoice_number);


--
-- Name: purchase_invoices purchase_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_company_id_order_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_order_number_key UNIQUE (company_id, order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_company_id_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_company_id_invoice_number_key UNIQUE (company_id, invoice_number);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_company_id_order_number_key; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_company_id_order_number_key UNIQUE (company_id, order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: vendor_payments unique_payment_number_per_company; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT unique_payment_number_per_company UNIQUE (company_id, payment_number, deleted_at);


--
-- Name: vendor_payments vendor_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_pkey PRIMARY KEY (id);


--
-- Name: idx_customs_declarations_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_company ON public.customs_declarations USING btree (company_id);


--
-- Name: idx_customs_declarations_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_date ON public.customs_declarations USING btree (declaration_date);


--
-- Name: idx_customs_declarations_deleted; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_deleted ON public.customs_declarations USING btree (deleted_at);


--
-- Name: idx_customs_declarations_number; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_number ON public.customs_declarations USING btree (declaration_number);


--
-- Name: idx_customs_declarations_po; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_po ON public.customs_declarations USING btree (purchase_order_id);


--
-- Name: idx_customs_declarations_port; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_port ON public.customs_declarations USING btree (port_id);


--
-- Name: idx_customs_declarations_project; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_project ON public.customs_declarations USING btree (project_id);


--
-- Name: idx_customs_declarations_shipment; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_shipment ON public.customs_declarations USING btree (shipment_id);


--
-- Name: idx_customs_declarations_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_status ON public.customs_declarations USING btree (status_id);


--
-- Name: idx_customs_declarations_type; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_customs_declarations_type ON public.customs_declarations USING btree (declaration_type_id);


--
-- Name: idx_expense_requests_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_company ON public.expense_requests USING btree (company_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_date ON public.expense_requests USING btree (request_date DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_printed; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_printed ON public.expense_requests USING btree (is_printed) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_project; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_project ON public.expense_requests USING btree (project_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_shipment; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_shipment ON public.expense_requests USING btree (shipment_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_source_expense; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_source_expense ON public.expense_requests USING btree (source_shipment_expense_id) WHERE (source_shipment_expense_id IS NOT NULL);


--
-- Name: idx_expense_requests_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_status ON public.expense_requests USING btree (status_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_user; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_user ON public.expense_requests USING btree (requested_by) WHERE (deleted_at IS NULL);


--
-- Name: idx_expense_requests_vendor; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_expense_requests_vendor ON public.expense_requests USING btree (vendor_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_gl_account; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_account ON public.general_ledger USING btree (account_id);


--
-- Name: idx_gl_account_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_account_date ON public.general_ledger USING btree (account_id, entry_date);


--
-- Name: idx_gl_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_company ON public.general_ledger USING btree (company_id);


--
-- Name: idx_gl_cost_center; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_cost_center ON public.general_ledger USING btree (cost_center_id);


--
-- Name: idx_gl_entry_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_entry_date ON public.general_ledger USING btree (entry_date);


--
-- Name: idx_gl_partner; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_partner ON public.general_ledger USING btree (partner_type, partner_id);


--
-- Name: idx_gl_period; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_period ON public.general_ledger USING btree (fiscal_year_id, period_id);


--
-- Name: idx_gl_posting_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_posting_date ON public.general_ledger USING btree (posting_date);


--
-- Name: idx_gl_project; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_gl_project ON public.general_ledger USING btree (project_id);


--
-- Name: idx_journal_entries_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_company ON public.journal_entries USING btree (company_id);


--
-- Name: idx_journal_entries_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_date ON public.journal_entries USING btree (entry_date);


--
-- Name: idx_journal_entries_number; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_number ON public.journal_entries USING btree (company_id, entry_number);


--
-- Name: idx_journal_entries_period; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_period ON public.journal_entries USING btree (fiscal_year_id, period_id);


--
-- Name: idx_journal_entries_source; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_source ON public.journal_entries USING btree (source_document_type, source_document_id);


--
-- Name: idx_journal_entries_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_status ON public.journal_entries USING btree (status);


--
-- Name: idx_journal_entries_type; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_journal_entries_type ON public.journal_entries USING btree (entry_type);


--
-- Name: idx_purchase_invoices_aging; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_aging ON public.purchase_invoices USING btree (company_id, due_date, is_posted) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_approval; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_approval ON public.purchase_invoices USING btree (approval_status) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_balance; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_balance ON public.purchase_invoices USING btree (balance) WHERE ((deleted_at IS NULL) AND (is_posted = true) AND (balance > (0)::numeric));


--
-- Name: idx_purchase_invoices_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_company ON public.purchase_invoices USING btree (company_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_dashboard_stats; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_dashboard_stats ON public.purchase_invoices USING btree (company_id, is_posted, invoice_date);


--
-- Name: idx_purchase_invoices_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_date ON public.purchase_invoices USING btree (invoice_date);


--
-- Name: idx_purchase_invoices_due_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_due_date ON public.purchase_invoices USING btree (due_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_overdue; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_overdue ON public.purchase_invoices USING btree (company_id, due_date, is_posted);


--
-- Name: idx_purchase_invoices_posting_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_posting_date ON public.purchase_invoices USING btree (posting_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_status ON public.purchase_invoices USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_type; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_type ON public.purchase_invoices USING btree (invoice_type_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_vendor; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_vendor ON public.purchase_invoices USING btree (vendor_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_invoices_vendor_aging; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_vendor_aging ON public.purchase_invoices USING btree (company_id, vendor_id, is_posted, due_date);


--
-- Name: idx_purchase_invoices_vendor_balance; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_invoices_vendor_balance ON public.purchase_invoices USING btree (vendor_id, balance, due_date) WHERE ((deleted_at IS NULL) AND (is_posted = true) AND (balance > (0)::numeric));


--
-- Name: idx_purchase_orders_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_company ON public.purchase_orders USING btree (company_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_date ON public.purchase_orders USING btree (order_date);


--
-- Name: idx_purchase_orders_destination_city; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_destination_city ON public.purchase_orders USING btree (destination_city_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_destination_country; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_destination_country ON public.purchase_orders USING btree (destination_country_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_origin_city; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_origin_city ON public.purchase_orders USING btree (origin_city_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_origin_country; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_origin_country ON public.purchase_orders USING btree (origin_country_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_outstanding; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_outstanding ON public.purchase_orders USING btree (company_id, status);


--
-- Name: idx_purchase_orders_payment_method; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_payment_method ON public.purchase_orders USING btree (payment_method_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_port_of_discharge; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_port_of_discharge ON public.purchase_orders USING btree (port_of_discharge_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_port_of_loading; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_port_of_loading ON public.purchase_orders USING btree (port_of_loading_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_project; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_project ON public.purchase_orders USING btree (project_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_report; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_report ON public.purchase_orders USING btree (company_id, vendor_id, status, order_date);


--
-- Name: idx_purchase_orders_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_purchase_orders_vendor; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_purchase_orders_vendor ON public.purchase_orders USING btree (vendor_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_sales_invoices_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_invoices_company ON public.sales_invoices USING btree (company_id);


--
-- Name: idx_sales_invoices_customer; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices USING btree (customer_id);


--
-- Name: idx_sales_invoices_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_invoices_date ON public.sales_invoices USING btree (invoice_date);


--
-- Name: idx_sales_invoices_due_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_invoices_due_date ON public.sales_invoices USING btree (due_date);


--
-- Name: idx_sales_invoices_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_invoices_status ON public.sales_invoices USING btree (status);


--
-- Name: idx_sales_orders_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_orders_company ON public.sales_orders USING btree (company_id);


--
-- Name: idx_sales_orders_customer; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_orders_customer ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_orders_date ON public.sales_orders USING btree (order_date);


--
-- Name: idx_sales_orders_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (status);


--
-- Name: idx_shipments_created_at; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_shipments_created_at ON public.shipments USING btree (created_at DESC);


--
-- Name: idx_shipments_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_shipments_status ON public.shipments USING btree (status);


--
-- Name: idx_shipments_supplier; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_shipments_supplier ON public.shipments USING btree (supplier_id);


--
-- Name: idx_shipments_tracking_number; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_shipments_tracking_number ON public.shipments USING btree (tracking_number);


--
-- Name: idx_vendor_payments_cash_box; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_cash_box ON public.vendor_payments USING btree (cash_box_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_company; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_company ON public.vendor_payments USING btree (company_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_company_posted_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_company_posted_status ON public.vendor_payments USING btree (company_id, is_posted, status) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_date ON public.vendor_payments USING btree (payment_date) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_invoice; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_invoice ON public.vendor_payments USING btree (invoice_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_lc; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_lc ON public.vendor_payments USING btree (lc_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_payment_date; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_payment_date ON public.vendor_payments USING btree (payment_date DESC) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_po; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_po ON public.vendor_payments USING btree (purchase_order_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_posted; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_posted ON public.vendor_payments USING btree (is_posted) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_project; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_project ON public.vendor_payments USING btree (project_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_quotation; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_quotation ON public.vendor_payments USING btree (quotation_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_shipment; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_shipment ON public.vendor_payments USING btree (shipment_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_source_type; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_source_type ON public.vendor_payments USING btree (source_type) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_status; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_status ON public.vendor_payments USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_unallocated; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_unallocated ON public.vendor_payments USING btree (unallocated_amount) WHERE ((unallocated_amount > (0)::numeric) AND (deleted_at IS NULL));


--
-- Name: idx_vendor_payments_unapplied; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_unapplied ON public.vendor_payments USING btree (company_id, unallocated_amount DESC) WHERE ((deleted_at IS NULL) AND (is_posted = true) AND (unallocated_amount > (0)::numeric));


--
-- Name: idx_vendor_payments_vendor; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_vendor ON public.vendor_payments USING btree (vendor_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_vendor_payments_vendor_id; Type: INDEX; Schema: public; Owner: slms
--

CREATE INDEX idx_vendor_payments_vendor_id ON public.vendor_payments USING btree (vendor_id) WHERE (deleted_at IS NULL);


--
-- Name: expense_requests trg_expense_request_number; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_expense_request_number BEFORE INSERT ON public.expense_requests FOR EACH ROW EXECUTE FUNCTION public.generate_expense_request_number();


--
-- Name: expense_requests trg_expense_requests_updated_at; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_expense_requests_updated_at BEFORE UPDATE ON public.expense_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expense_requests trg_log_expense_request_approval; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_log_expense_request_approval AFTER INSERT OR UPDATE ON public.expense_requests FOR EACH ROW EXECUTE FUNCTION public.log_request_approval();


--
-- Name: vendor_payments trg_payment_unallocated_insert; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_payment_unallocated_insert BEFORE INSERT ON public.vendor_payments FOR EACH ROW EXECUTE FUNCTION public.update_payment_unallocated();


--
-- Name: vendor_payments trg_payment_unallocated_update; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_payment_unallocated_update BEFORE UPDATE ON public.vendor_payments FOR EACH ROW WHEN (((old.payment_amount IS DISTINCT FROM new.payment_amount) OR (old.allocated_amount IS DISTINCT FROM new.allocated_amount))) EXECUTE FUNCTION public.update_payment_unallocated();


--
-- Name: journal_entries trg_prevent_journal_delete; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_prevent_journal_delete BEFORE DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.prevent_posted_delete();


--
-- Name: journal_entries trg_prevent_journal_edit; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_prevent_journal_edit BEFORE UPDATE ON public.journal_entries FOR EACH ROW WHEN (((old.status = ANY (ARRAY['posted'::public.document_status, 'reversed'::public.document_status])) AND (new.status = old.status))) EXECUTE FUNCTION public.prevent_posted_edit();


--
-- Name: general_ledger trg_seq_general_ledger; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_seq_general_ledger BEFORE INSERT ON public.general_ledger FOR EACH ROW EXECUTE FUNCTION public.slms_set_sequence_fields();


--
-- Name: journal_entries trg_seq_journal_entries; Type: TRIGGER; Schema: public; Owner: slms
--

CREATE TRIGGER trg_seq_journal_entries BEFORE INSERT ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.slms_set_sequence_fields();


--
-- Name: customs_declarations customs_declarations_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: customs_declarations customs_declarations_commercial_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_commercial_invoice_id_fkey FOREIGN KEY (commercial_invoice_id) REFERENCES public.purchase_invoices(id);


--
-- Name: customs_declarations customs_declarations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: customs_declarations customs_declarations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: customs_declarations customs_declarations_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: customs_declarations customs_declarations_declaration_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_declaration_type_id_fkey FOREIGN KEY (declaration_type_id) REFERENCES public.customs_declaration_types(id);


--
-- Name: customs_declarations customs_declarations_destination_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_destination_country_id_fkey FOREIGN KEY (destination_country_id) REFERENCES public.countries(id);


--
-- Name: customs_declarations customs_declarations_origin_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_origin_country_id_fkey FOREIGN KEY (origin_country_id) REFERENCES public.countries(id);


--
-- Name: customs_declarations customs_declarations_port_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_port_id_fkey FOREIGN KEY (port_id) REFERENCES public.ports(id);


--
-- Name: customs_declarations customs_declarations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: customs_declarations customs_declarations_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: customs_declarations customs_declarations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: customs_declarations customs_declarations_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.logistics_shipments(id);


--
-- Name: customs_declarations customs_declarations_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.customs_declaration_statuses(id);


--
-- Name: customs_declarations customs_declarations_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: customs_declarations customs_declarations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.customs_declarations
    ADD CONSTRAINT customs_declarations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: expense_requests expense_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: expense_requests expense_requests_exchange_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_exchange_rate_id_fkey FOREIGN KEY (exchange_rate_id) REFERENCES public.exchange_rates(id);


--
-- Name: expense_requests expense_requests_expense_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_expense_type_id_fkey FOREIGN KEY (expense_type_id) REFERENCES public.request_expense_types(id);


--
-- Name: expense_requests expense_requests_first_printed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_first_printed_by_fkey FOREIGN KEY (first_printed_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: expense_requests expense_requests_last_printed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_last_printed_by_fkey FOREIGN KEY (last_printed_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_logistics_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_logistics_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.logistics_shipments(id) ON DELETE SET NULL;


--
-- Name: expense_requests expense_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: expense_requests expense_requests_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_source_shipment_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_source_shipment_expense_id_fkey FOREIGN KEY (source_shipment_expense_id) REFERENCES public.shipment_expenses(id) ON DELETE SET NULL;


--
-- Name: expense_requests expense_requests_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.request_statuses(id);


--
-- Name: expense_requests expense_requests_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: expense_requests expense_requests_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.expense_requests
    ADD CONSTRAINT expense_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: general_ledger general_ledger_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: general_ledger general_ledger_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: general_ledger general_ledger_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: general_ledger general_ledger_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: general_ledger general_ledger_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: general_ledger general_ledger_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id);


--
-- Name: general_ledger general_ledger_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: general_ledger general_ledger_journal_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_journal_line_id_fkey FOREIGN KEY (journal_line_id) REFERENCES public.journal_lines(id);


--
-- Name: general_ledger general_ledger_numbering_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_numbering_series_id_fkey FOREIGN KEY (numbering_series_id) REFERENCES public.numbering_series(id);


--
-- Name: general_ledger general_ledger_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id);


--
-- Name: general_ledger general_ledger_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: general_ledger general_ledger_profit_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_profit_center_id_fkey FOREIGN KEY (profit_center_id) REFERENCES public.profit_centers(id);


--
-- Name: general_ledger general_ledger_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.general_ledger
    ADD CONSTRAINT general_ledger_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: journal_entries journal_entries_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: journal_entries journal_entries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: journal_entries journal_entries_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id);


--
-- Name: journal_entries journal_entries_numbering_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_numbering_series_id_fkey FOREIGN KEY (numbering_series_id) REFERENCES public.numbering_series(id);


--
-- Name: journal_entries journal_entries_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.accounting_periods(id);


--
-- Name: journal_entries journal_entries_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_reversal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_reversal_entry_id_fkey FOREIGN KEY (reversal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: journal_entries journal_entries_reversal_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_reversal_of_fkey FOREIGN KEY (reversal_of) REFERENCES public.journal_entries(id);


--
-- Name: journal_entries journal_entries_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.journal_entries(id);


--
-- Name: journal_entries journal_entries_reversed_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_reversed_entry_id_fkey FOREIGN KEY (reversed_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: journal_entries journal_entries_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_approval_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id);


--
-- Name: purchase_invoices purchase_invoices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: purchase_invoices purchase_invoices_cash_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_cash_box_id_fkey FOREIGN KEY (cash_box_id) REFERENCES public.cash_boxes(id);


--
-- Name: purchase_invoices purchase_invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: purchase_invoices purchase_invoices_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: purchase_invoices purchase_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: purchase_invoices purchase_invoices_goods_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_goods_receipt_id_fkey FOREIGN KEY (goods_receipt_id) REFERENCES public.goods_receipts(id);


--
-- Name: purchase_invoices purchase_invoices_invoice_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_invoice_type_id_fkey FOREIGN KEY (invoice_type_id) REFERENCES public.invoice_types(id);


--
-- Name: purchase_invoices purchase_invoices_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id);


--
-- Name: purchase_invoices purchase_invoices_payment_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_payment_terms_id_fkey FOREIGN KEY (payment_terms_id) REFERENCES public.vendor_payment_terms(id);


--
-- Name: purchase_invoices purchase_invoices_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_invoices purchase_invoices_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: purchase_invoices purchase_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_invoices
    ADD CONSTRAINT purchase_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_orders purchase_orders_approval_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id);


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.vendor_contracts(id);


--
-- Name: purchase_orders purchase_orders_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: purchase_orders purchase_orders_delivery_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_delivery_terms_id_fkey FOREIGN KEY (delivery_terms_id) REFERENCES public.delivery_terms(id);


--
-- Name: purchase_orders purchase_orders_destination_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_destination_city_id_fkey FOREIGN KEY (destination_city_id) REFERENCES public.cities(id);


--
-- Name: purchase_orders purchase_orders_destination_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_destination_country_id_fkey FOREIGN KEY (destination_country_id) REFERENCES public.countries(id);


--
-- Name: purchase_orders purchase_orders_incoterm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_incoterm_id_fkey FOREIGN KEY (incoterm_id) REFERENCES public.incoterms(id);


--
-- Name: purchase_orders purchase_orders_order_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_type_id_fkey FOREIGN KEY (order_type_id) REFERENCES public.purchase_order_types(id);


--
-- Name: purchase_orders purchase_orders_origin_city_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_origin_city_id_fkey FOREIGN KEY (origin_city_id) REFERENCES public.cities(id);


--
-- Name: purchase_orders purchase_orders_origin_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_origin_country_id_fkey FOREIGN KEY (origin_country_id) REFERENCES public.countries(id);


--
-- Name: purchase_orders purchase_orders_payment_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;


--
-- Name: purchase_orders purchase_orders_payment_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_payment_terms_id_fkey FOREIGN KEY (payment_terms_id) REFERENCES public.vendor_payment_terms(id);


--
-- Name: purchase_orders purchase_orders_port_of_discharge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_port_of_discharge_id_fkey FOREIGN KEY (port_of_discharge_id) REFERENCES public.ports(id);


--
-- Name: purchase_orders purchase_orders_port_of_loading_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_port_of_loading_id_fkey FOREIGN KEY (port_of_loading_id) REFERENCES public.ports(id);


--
-- Name: purchase_orders purchase_orders_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.vendor_quotations(id);


--
-- Name: purchase_orders purchase_orders_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_reversed_by_fkey FOREIGN KEY (reversed_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.purchase_order_statuses(id);


--
-- Name: purchase_orders purchase_orders_supply_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supply_terms_id_fkey FOREIGN KEY (supply_terms_id) REFERENCES public.supply_terms(id);


--
-- Name: purchase_orders purchase_orders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: purchase_orders purchase_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: sales_invoices sales_invoices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: sales_invoices sales_invoices_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: sales_invoices sales_invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: sales_invoices sales_invoices_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_invoices sales_invoices_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: sales_invoices sales_invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales_invoices sales_invoices_delivery_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_delivery_note_id_fkey FOREIGN KEY (delivery_note_id) REFERENCES public.delivery_notes(id);


--
-- Name: sales_invoices sales_invoices_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: sales_invoices sales_invoices_receivable_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_receivable_account_id_fkey FOREIGN KEY (receivable_account_id) REFERENCES public.accounts(id);


--
-- Name: sales_invoices sales_invoices_revenue_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_revenue_account_id_fkey FOREIGN KEY (revenue_account_id) REFERENCES public.accounts(id);


--
-- Name: sales_invoices sales_invoices_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: sales_invoices sales_invoices_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);


--
-- Name: sales_invoices sales_invoices_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.sales_document_statuses(id);


--
-- Name: sales_invoices sales_invoices_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: sales_invoices sales_invoices_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: sales_orders sales_orders_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: sales_orders sales_orders_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_credit_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_credit_approved_by_fkey FOREIGN KEY (credit_approved_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales_orders sales_orders_price_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_price_list_id_fkey FOREIGN KEY (price_list_id) REFERENCES public.price_lists(id);


--
-- Name: sales_orders sales_orders_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.sales_quotations(id);


--
-- Name: sales_orders sales_orders_sales_rep_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.sales_document_statuses(id);


--
-- Name: sales_orders sales_orders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: sales_orders sales_orders_warehouse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_warehouse_id_fkey FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: shipments shipments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: vendor_payments vendor_payments_approval_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_approval_request_id_fkey FOREIGN KEY (approval_request_id) REFERENCES public.approval_requests(id);


--
-- Name: vendor_payments vendor_payments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: vendor_payments vendor_payments_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: vendor_payments vendor_payments_cash_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_cash_box_id_fkey FOREIGN KEY (cash_box_id) REFERENCES public.cash_boxes(id);


--
-- Name: vendor_payments vendor_payments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: vendor_payments vendor_payments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: vendor_payments vendor_payments_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: vendor_payments vendor_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.purchase_invoices(id);


--
-- Name: vendor_payments vendor_payments_lc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_lc_id_fkey FOREIGN KEY (lc_id) REFERENCES public.letters_of_credit(id);


--
-- Name: vendor_payments vendor_payments_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: vendor_payments vendor_payments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: vendor_payments vendor_payments_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: vendor_payments vendor_payments_quotation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.vendor_quotations(id);


--
-- Name: vendor_payments vendor_payments_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.logistics_shipments(id);


--
-- Name: vendor_payments vendor_payments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: vendor_payments vendor_payments_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: slms
--

ALTER TABLE ONLY public.vendor_payments
    ADD CONSTRAINT vendor_payments_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- PostgreSQL database dump complete
--

\unrestrict hlII8VS8ceMyMZSVjpKgjs98LIBmghMBrdRLEtg6iSB3UbKATk6cNutke43ofRY

