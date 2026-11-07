from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QPushButton, QLineEdit, QComboBox, QCheckBox, QTableWidget, 
    QTableWidgetItem, QHeaderView, QAbstractItemView, QDialog, 
    QFormLayout, QDateEdit, QTextEdit, QMessageBox, QMenu, QFrame, QTabWidget, QApplication
)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QColor, QAction, QKeySequence, QShortcut
from datetime import date, timedelta
from features import SupabaseManager
from follow_up import calculate_follow_ups
from ai_assistant import AIFollowUpOverlayWidget

def format_db_to_ui_date(date_str: str) -> str:
    """Converts YYYY-MM-DD to Sep 08, 2026"""
    if not date_str:
        return ""
    try:
        return date.fromisoformat(date_str).strftime("%b %d, %Y")
    except ValueError:
        return date_str

def format_date_range(start_str: str, end_str: str) -> str:
    """Combines two ISO dates into a clean span, e.g., 'Nov 03–05, 2026'"""
    if not start_str:
        return ""
    if not end_str or start_str == end_str:
        return format_db_to_ui_date(start_str)
    
    try:
        d1 = date.fromisoformat(start_str)
        d2 = date.fromisoformat(end_str)
        
        if d1.year == d2.year and d1.month == d2.month:
            return f"{d1.strftime('%b')} {d1.strftime('%d')}–{d2.strftime('%d')}, {d1.year}"
        else:
            return f"{d1.strftime('%b %d')} – {d2.strftime('%b %d, %Y')}"
    except ValueError:
        return f"{start_str} - {end_str}"

class ChronoTableWidgetItem(QTableWidgetItem):
    def __init__(self, display_text, raw_date_str):
        super().__init__(display_text)
        self.raw_date_str = raw_date_str

    def __lt__(self, other):
        if isinstance(other, ChronoTableWidgetItem):
            return self.raw_date_str < other.raw_date_str
        return super().__lt__(other)

class LeadDialog(QDialog):
    def __init__(self, parent=None, lead_data=None):
        super().__init__(parent)
        self.lead_data = lead_data
        self.setWindowTitle("Add New Lead" if not lead_data else "Edit Lead")
        self.setMinimumWidth(500)
        self.setup_ui()
        if self.lead_data:
            self.load_lead_data()

    from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QLabel, 
    QPushButton, QLineEdit, QComboBox, QCheckBox, QTableWidget, 
    QTableWidgetItem, QHeaderView, QAbstractItemView, QDialog, 
    QFormLayout, QDateEdit, QTextEdit, QMessageBox, QMenu, QFrame, QTabWidget, QApplication
)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QColor, QAction, QKeySequence, QShortcut
from datetime import date, timedelta
from features import SupabaseManager
from follow_up import calculate_follow_ups
from ai_assistant import AIFollowUpOverlayWidget

def format_db_to_ui_date(date_str: str) -> str:
    """Converts YYYY-MM-DD to Sep 08, 2026"""
    if not date_str:
        return ""
    try:
        return date.fromisoformat(date_str).strftime("%b %d, %Y")
    except ValueError:
        return date_str

def format_date_range(start_str: str, end_str: str) -> str:
    """Combines two ISO dates into a clean span, e.g., 'Nov 03–05, 2026'"""
    if not start_str:
        return ""
    if not end_str or start_str == end_str:
        return format_db_to_ui_date(start_str)
    
    try:
        d1 = date.fromisoformat(start_str)
        d2 = date.fromisoformat(end_str)
        
        if d1.year == d2.year and d1.month == d2.month:
            return f"{d1.strftime('%b')} {d1.strftime('%d')}–{d2.strftime('%d')}, {d1.year}"
        else:
            return f"{d1.strftime('%b %d')} – {d1.strftime('%b %d, %Y')}"
    except ValueError:
        return f"{start_str} - {end_str}"

class ChronoTableWidgetItem(QTableWidgetItem):
    def __init__(self, display_text, raw_date_str):
        super().__init__(display_text)
        self.raw_date_str = raw_date_str

    def __lt__(self, other):
        if isinstance(other, ChronoTableWidgetItem):
            return self.raw_date_str < other.raw_date_str
        return super().__lt__(other)

class LeadDialog(QDialog):
    def __init__(self, parent=None, lead_data=None):
        super().__init__(parent)
        self.lead_data = lead_data
        self.db_manager = parent.db if parent else SupabaseManager()
        self.setWindowTitle("Add New Lead" if not lead_data else "Edit Lead")
        self.setMinimumWidth(500)
        self.profiles_map = {} # Maps full_name -> id
        self.load_profiles()
        self.setup_ui()
        if self.lead_data:
            self.load_lead_data()

    def load_profiles(self):
        """Fetch profiles from Supabase and combine first and last names for the dropdown."""
        self.profiles_map = {}
        try:
            # Fetch id, first_name, and last_name from the profiles table
            response = self.db_manager.client.table("profiles").select("id, first_name, last_name").execute()
            if response.data:
                for row in response.data:
                    first = row.get("first_name") or ""
                    last = row.get("last_name") or ""
                    full_name = f"{first} {last}".strip()
                    if full_name:
                        self.profiles_map[full_name] = row["id"]
        except Exception as e:
            print(f"Profile fetch error: {e}")

        # Fallback if the profiles table query returns empty or encounters issues
        if not self.profiles_map and self.parent() and hasattr(self.parent(), "raw_data"):
            existing_owners = {item.get("lead_owner") for item in self.parent().raw_data if item.get("lead_owner")}
            self.profiles_map = {name: None for name in existing_owners}

    def setup_ui(self):
        layout = QVBoxLayout(self)
        form_layout = QFormLayout()
        form_layout.setSpacing(10)

        self.input_lead_date = QDateEdit(calendarPopup=True)
        self.input_lead_date.setDate(QDate.currentDate())
        
        self.input_client_name = QLineEdit()
        self.input_client_email = QLineEdit()
        self.input_country = QLineEdit()
        self.input_event_name = QLineEdit()
        
        self.input_event_start = QDateEdit(calendarPopup=True)
        self.input_event_start.setDate(QDate.currentDate().addDays(30))
        
        self.input_event_end = QDateEdit(calendarPopup=True)
        self.input_event_end.setDate(QDate.currentDate().addDays(32))
        
        self.chk_auto_generate = QCheckBox("Auto-calculate follow up tracks default")
        self.chk_auto_generate.setChecked(True)
        self.chk_auto_generate.toggled.connect(self.toggle_follow_up_input)
        
        self.input_follow_up = QDateEdit(calendarPopup=True)
        self.input_follow_up.setDate(QDate.currentDate().addDays(2))
        self.input_follow_up.setEnabled(False)
        
        self.input_sales_person = QComboBox()
        self.input_sales_person.addItems(["Michael", "Eva West"])
        self.input_sales_person.setCurrentText("Michael")
        self.input_sender_email = QLineEdit()
        
        # Lead Owner Dropdown (Editable + Searchable)
        self.input_lead_owner_combo = QComboBox()
        self.input_lead_owner_combo.setEditable(True)
        self.input_lead_owner_combo.setInsertPolicy(QComboBox.InsertPolicy.NoInsert)
        
        # Configure case-insensitive auto-completion filtering while typing
        completer = self.input_lead_owner_combo.completer()
        if completer:
            completer.setFilterMode(Qt.MatchFlag.MatchContains)
            completer.setCaseSensitivity(Qt.CaseSensitivity.CaseInsensitive)
            
        self.input_lead_owner_combo.addItem("-- Select Owner --", None)
        for name in sorted(self.profiles_map.keys()):
            self.input_lead_owner_combo.addItem(name, self.profiles_map[name])
        
        self.input_status = QComboBox()
        self.input_status.addItems(["New Lead", "Interested", "Sample Requested", "Deal Closed", "No Response", "Not Interested"])
        
        self.input_remarks = QTextEdit()
        self.input_remarks.setMaximumHeight(80)

        form_layout.addRow("Lead Date *", self.input_lead_date)
        form_layout.addRow("Client Name *", self.input_client_name)
        form_layout.addRow("Client Email *", self.input_client_email)
        form_layout.addRow("Country", self.input_country)
        form_layout.addRow("Event Name", self.input_event_name)
        form_layout.addRow("Event Start Date", self.input_event_start)
        form_layout.addRow("Event End Date", self.input_event_end)
        form_layout.addRow("", self.chk_auto_generate)
        form_layout.addRow("Manual Follow Up Target Date", self.input_follow_up)
        form_layout.addRow("Sales Person", self.input_sales_person)
        form_layout.addRow("Sender Email", self.input_sender_email)
        form_layout.addRow("Lead Owner", self.input_lead_owner_combo)
        form_layout.addRow("Lead Status", self.input_status)
        form_layout.addRow("Remarks", self.input_remarks)

        layout.addLayout(form_layout)

        btn_layout = QHBoxLayout()
        self.btn_save = QPushButton("Save")
        self.btn_cancel = QPushButton("Cancel")
        
        btn_layout.addStretch()
        btn_layout.addWidget(self.btn_save)
        btn_layout.addWidget(self.btn_cancel)
        layout.addLayout(btn_layout)

        self.btn_save.clicked.connect(self.validate_and_accept)
        self.btn_cancel.clicked.connect(self.reject)

    def toggle_follow_up_input(self, checked):
        self.input_follow_up.setEnabled(not checked)

    def load_lead_data(self):
        d = self.lead_data
        if d.get("lead_date"): self.input_lead_date.setDate(QDate.fromString(d["lead_date"], Qt.DateFormat.ISODate))
        self.input_client_name.setText(d.get("client_name") or "")
        self.input_client_email.setText(d.get("client_email") or "")
        self.input_country.setText(d.get("country") or "")
        self.input_event_name.setText(d.get("event_name") or "")
        if d.get("event_start_date"): self.input_event_start.setDate(QDate.fromString(d["event_start_date"], Qt.DateFormat.ISODate))
        if d.get("event_end_date"): self.input_event_end.setDate(QDate.fromString(d["event_end_date"], Qt.DateFormat.ISODate))
        
        if d.get("follow_up_date"): 
            self.input_follow_up.setDate(QDate.fromString(d["follow_up_date"], Qt.DateFormat.ISODate))
            self.chk_auto_generate.setChecked(False)
            self.input_follow_up.setEnabled(True)
            
        sales_person_val = d.get("sales_person")
        if sales_person_val:
            index = self.input_sales_person.findText(sales_person_val, Qt.MatchFlag.MatchContains)
            if index >= 0:
                self.input_sales_person.setCurrentIndex(index)
            else:
                self.input_sales_person.setCurrentText(sales_person_val)
        self.input_sender_email.setText(d.get("sender_email") or "")
        
        # Load lead owner: select existing profile or set custom text
        owner_name = d.get("lead_owner") or ""
        index = self.input_lead_owner_combo.findText(owner_name, Qt.MatchFlag.MatchExactly)
        if index >= 0:
            self.input_lead_owner_combo.setCurrentIndex(index)
        else:
            self.input_lead_owner_combo.setCurrentText(owner_name)
                
        self.input_status.setCurrentText(d.get("lead_status") or "New Lead")
        self.input_remarks.setPlainText(d.get("Remarks") or "")

    def validate_and_accept(self):
        if not self.input_client_email.text().strip():
            QMessageBox.warning(self, "Validation Error", "Client Email field is required.")
            return
        if not self.input_client_name.text().strip():
            QMessageBox.warning(self, "Validation Error", "Client Name field is required.")
            return
        self.accept()

    def get_data(self) -> dict:
        lead_date_obj = self.input_lead_date.date().toPyDate()
        event_start_obj = self.input_event_start.date().toPyDate()
        
        if self.chk_auto_generate.isChecked():
            calculated_dates = calculate_follow_ups(lead_date_obj, event_start_obj)
            final_follow_up = calculated_dates[0].isoformat()
        else:
            final_follow_up = self.input_follow_up.date().toString(Qt.DateFormat.ISODate)

        # === ADD IT HERE ===
        typed_owner = self.input_lead_owner_combo.currentText().strip()

        if not typed_owner or typed_owner == "-- Select Owner --":
            owner_name = None
            owner_id = None
        else:
            owner_name = typed_owner
            # Look up UUID from database profiles map (case-insensitive check)
            matched_id = None
            for p_name, p_id in self.profiles_map.items():
                if p_name.lower() == typed_owner.lower():
                    matched_id = p_id
                    break
            owner_id = matched_id
        # ===================

        return {
            "lead_date": self.input_lead_date.date().toString(Qt.DateFormat.ISODate),
            "client_name": self.input_client_name.text().strip(),
            "client_email": self.input_client_email.text().strip(),
            "country": self.input_country.text().strip(),
            "event_name": self.input_event_name.text().strip(),
            "event_start_date": self.input_event_start.date().toString(Qt.DateFormat.ISODate),
            "event_end_date": self.input_event_end.date().toString(Qt.DateFormat.ISODate),
            "follow_up_date": final_follow_up,
            "sales_person": self.input_sales_person.currentText(),
            "sender_email": self.input_sender_email.text().strip(),
            "lead_owner": owner_name,         # Saves typed name string (e.g. "Mohan Rayudu" or custom "Mahesh")
            "lead_owner_id": owner_id,        # Saves matching profile UUID or sets to None (NULL) if custom typed
            "lead_status": self.input_status.currentText(),
            "Remarks": self.input_remarks.toPlainText().strip()
        }


class MainWindow(QMainWindow):
    def handle_ai_time_update(self, record_id: int, new_time: str):
        try:
            self.db.update(record_id, {"best_time": new_time})
            QMessageBox.information(self, "CRM Updated", f"Best follow-up time updated to {new_time}")
            self.load_data()
        except Exception as e:
            QMessageBox.critical(self, "Update Error", str(e))

    def toggle_ai_panel(self):
        if self.ai_overlay.isVisible():
            self.ai_overlay.hide()
        else:
            x = (self.width() - self.ai_overlay.width()) // 2
            y = (self.height() - self.ai_overlay.height()) // 2
            self.ai_overlay.move(x, max(20, y))
            self.ai_overlay.show()
            self.ai_overlay.raise_()

    def on_master_lead_selected(self):
        record_id = self.get_selected_db_id()
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)
        self.ai_overlay.set_lead(lead_data)

    def on_followup_lead_selected(self):
        selected_indexes = self.follow_up_table.selectionModel().selectedRows()
        if not selected_indexes:
            return
        record_id = self.follow_up_table.item(selected_indexes[0].row(), 0).data(Qt.ItemDataRole.UserRole)
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)
        self.ai_overlay.set_lead(lead_data)

    def handle_ai_date_update(self, record_id: int, new_date: str):
        try:
            self.db.update(record_id, {"follow_up_date": new_date})
            QMessageBox.information(self, "CRM Updated", f"Follow-up date updated to {new_date}")
            self.load_data()
        except Exception as e:
            QMessageBox.critical(self, "Update Error", str(e))

    def copy_master(self):
        rows = []
        for r in range(self.table.rowCount()):
            rows.append("\t".join(
                self.table.item(r, c).text() if self.table.item(r, c) else ""
                for c in range(self.table.columnCount())
            ))
        QApplication.clipboard().setText("\n".join(rows))

    def handle_master_email_click(self, item):
        if item.column() == 2:  # Column 2 is "Client Email" in Master Table
            email = item.text().strip()
            if email:
                QApplication.clipboard().setText(email)
                self.statusBar().showMessage(f"Copied email: {email}", 3000)

    def handle_followup_email_click(self, item):
        if item.column() == 1:  # Column 1 is "Client Email"
            email = item.text().strip()
            if email:
                QApplication.clipboard().setText(email)
                self.statusBar().showMessage(f"Copied email: {email}", 3000)

    def copy_followup(self):
        rows = []
        for r in range(self.follow_up_table.rowCount()):
            values = []
            for c in range(self.follow_up_table.columnCount()):
                if c == 7:  # Action button
                    values.append("Done")
                else:
                    item = self.follow_up_table.item(r, c)
                    values.append(item.text() if item else "")
            rows.append("\t".join(values))

        QApplication.clipboard().setText("\n".join(rows))

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Team Leads CRM Matrix Suite")
        self.resize(1640, 920)
        self.db = SupabaseManager()
        self.raw_data = []
        self.filtered_data = []
        
        self.setup_ui()
        self.apply_styles()
        self.setup_shortcuts()
        
        if self.db.connect():
            self.load_data()
        else:
            QMessageBox.critical(self, "Connection Error", "Could not connect to Supabase.")

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(10, 8, 10, 8)
        main_layout.setSpacing(6)
        
        dashboard_widget = QWidget()
        dashboard_layout = QHBoxLayout(dashboard_widget)
        self.cards = {}
        metrics = ["Total Leads", "Deals", "Interested", "Follow Up Today", "Overdue"]
        for metric in metrics:
            frame = QFrame()
            frame.setObjectName("CardFrame")
            card_layout = QVBoxLayout(frame)
            card_layout.setContentsMargins(10, 6, 10, 6)
            frame.setMaximumHeight(60)
            title_lbl = QLabel(metric.upper())
            title_lbl.setObjectName("CardTitle")
            title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            val_lbl = QLabel("0")
            val_lbl.setObjectName("CardValue")
            val_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            card_layout.addWidget(title_lbl)
            card_layout.addWidget(val_lbl)
            dashboard_layout.addWidget(frame)
            self.cards[metric] = val_lbl
        main_layout.addWidget(dashboard_widget)
        dashboard_widget.hide()

        self.tabs = QTabWidget()
        main_layout.addWidget(self.tabs)
        
        # TAB 1: MASTER REGISTRY
        tab1_widget = QWidget()
        tab1_layout = QVBoxLayout(tab1_widget)
        tab1_layout.setContentsMargins(6, 2, 6, 2)
        tab1_layout.setSpacing(4)
        
        filter_panel = QHBoxLayout()
        filter_panel.setSpacing(10)
        
        self.txt_search = QLineEdit()
        self.txt_search.setPlaceholderText("Search any keyword...")
        self.txt_search.textChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.txt_search, 2)
        
        self.cmb_date_scope = QComboBox()
        self.cmb_date_scope.addItems(["Last 30 Days Only", "All Time Records"])
        self.cmb_date_scope.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_date_scope, 1)
        
        self.cmb_status = QComboBox()
        self.cmb_status.addItem("All Statuses")
        self.cmb_status.addItems(["New Lead", "Interested", "Sample Requested", "Deal Closed", "No Response", "Not Interested"])
        self.cmb_status.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_status, 1)

        self.cmb_country = QComboBox()
        self.cmb_country.addItem("All Countries")
        self.cmb_country.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_country, 1)

        self.cmb_sales = QComboBox()
        self.cmb_sales.addItem("All Sales Persons")
        self.cmb_sales.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_sales, 1)

        self.cmb_owner = QComboBox()
        self.cmb_owner.addItem("All Owners")
        self.cmb_owner.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_owner, 1)

        self.btn_clear_filter = QPushButton("Clear Filter")
        self.btn_clear_filter.clicked.connect(self.clear_filters)
        filter_panel.addWidget(self.btn_clear_filter)
        tab1_layout.addLayout(filter_panel)

        action_layout = QHBoxLayout()
        self.btn_add = QPushButton("Add Lead")
        self.btn_edit = QPushButton("Edit")
        self.btn_delete = QPushButton("Delete")
        self.btn_refresh = QPushButton("Refresh")
        self.btn_copy = QPushButton("Copy All")
        self.btn_copy.clicked.connect(self.copy_master)
        
        self.btn_toggle_ai = QPushButton("✦ AI Assistant")
        self.btn_toggle_ai.setStyleSheet("background-color: #8b5cf6; color: white; font-weight: bold;")
        self.btn_toggle_ai.clicked.connect(self.toggle_ai_panel)
        
        self.btn_add.setObjectName("BtnAdd")
        self.btn_edit.setObjectName("BtnEdit")
        self.btn_delete.setObjectName("BtnDelete")
        self.btn_refresh.setObjectName("BtnRefresh")

        self.btn_add.clicked.connect(self.add_lead)
        self.btn_edit.clicked.connect(self.edit_lead)
        self.btn_delete.clicked.connect(self.delete_lead)
        self.btn_refresh.clicked.connect(self.load_data)

        action_layout.addWidget(self.btn_add)
        action_layout.addWidget(self.btn_edit)
        action_layout.addWidget(self.btn_delete)
        action_layout.addWidget(self.btn_toggle_ai)
        action_layout.addStretch()
        action_layout.addWidget(self.btn_copy)
        action_layout.addWidget(self.btn_refresh)
        tab1_layout.addLayout(action_layout)

        self.table = QTableWidget()
        self.table.setColumnCount(12)
        self.table.setHorizontalHeaderLabels([
            "Lead Date", "Client Name", "Client Email", "Country", "Event",
            "Event Dates", "Follow Up", "Sales Person",
            "Sender Email", "Lead Owner", "Status", "Remarks"
        ])
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSortingEnabled(True)
        self.table.setShowGrid(True)
        
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        header.setStretchLastSection(True)
        
        self.table.setColumnWidth(0, 120)
        self.table.setColumnWidth(1, 160)
        self.table.setColumnWidth(2, 220)
        self.table.setColumnWidth(3, 110)
        self.table.setColumnWidth(4, 180)
        self.table.setColumnWidth(5, 130)
        self.table.setColumnWidth(6, 100)
        self.table.setColumnWidth(7, 130)
        self.table.setColumnWidth(8, 160)
        self.table.setColumnWidth(9, 110)
        self.table.setColumnWidth(10, 120)
        
        self.table.itemDoubleClicked.connect(self.edit_lead)
        self.table.itemClicked.connect(self.handle_master_email_click)
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_context_menu)
        self.table.itemSelectionChanged.connect(self.on_master_lead_selected)
        
        tab1_layout.addWidget(self.table, 1)
        self.tabs.addTab(tab1_widget, "Master Leads Registry")

        # TAB 2: FOLLOW UP
        tab2_widget = QWidget()
        tab2_layout = QVBoxLayout(tab2_widget)
        tab2_layout.setContentsMargins(10, 15, 10, 10)
        
        selector_layout = QHBoxLayout()
        selector_layout.addWidget(QLabel("Select Follow-Up Window scope:"))
        self.cmb_follow_up_scope = QComboBox()
        self.cmb_follow_up_scope.addItems(["Today's Follow-Ups", "Overdue Follow-Ups", "Completed This Week", "All Follow-Ups"])
        self.cmb_follow_up_scope.currentTextChanged.connect(self.refresh_follow_up_table)
        selector_layout.addWidget(self.cmb_follow_up_scope, 1)
        
        self.btn_toggle_ai_fu = QPushButton("✦ AI Assistant")
        self.btn_toggle_ai_fu.setStyleSheet("background-color: #8b5cf6; color: white; font-weight: bold;")
        self.btn_toggle_ai_fu.clicked.connect(self.toggle_ai_panel)
        selector_layout.addWidget(self.btn_toggle_ai_fu)

        selector_layout.addStretch(3)
        self.btn_copy_follow = QPushButton("Copy All")
        self.btn_copy_follow.clicked.connect(self.copy_followup)
        selector_layout.addWidget(self.btn_copy_follow)
        tab2_layout.addLayout(selector_layout)
        
        self.follow_up_table = QTableWidget()
        self.follow_up_table.setColumnCount(8)
        self.follow_up_table.setHorizontalHeaderLabels([
            "Event Name", "Client Email", "Country", "Event Date Span", "Days Remaining to Event", "Current Follow Up Schedule Status", "Scheduled Follow Up Date", "Action"
        ])
        self.follow_up_table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.follow_up_table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.follow_up_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.follow_up_table.setSortingEnabled(True)
        
        self.follow_up_table.itemDoubleClicked.connect(self.edit_lead_from_follow_up)
        self.follow_up_table.itemClicked.connect(self.handle_followup_email_click)
        self.follow_up_table.itemSelectionChanged.connect(self.on_followup_lead_selected)

        fu_header = self.follow_up_table.horizontalHeader()
        fu_header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        fu_header.setStretchLastSection(True)
        self.follow_up_table.setColumnWidth(0, 180)
        self.follow_up_table.setColumnWidth(1, 210)
        self.follow_up_table.setColumnWidth(2, 110)
        self.follow_up_table.setColumnWidth(3, 180)
        self.follow_up_table.setColumnWidth(4, 150)
        self.follow_up_table.setColumnWidth(5, 180)
        self.follow_up_table.setColumnWidth(6, 140)
        
        tab2_layout.addWidget(self.follow_up_table)
        self.tabs.addTab(tab2_widget, "Follow Up")

        # Instantiate Floating Overlay Widget
        self.ai_overlay = AIFollowUpOverlayWidget(self)
        self.ai_overlay.date_updated_signal.connect(self.handle_ai_date_update)
        self.ai_overlay.time_updated_signal.connect(self.handle_ai_time_update)

    def setup_shortcuts(self):
        QShortcut(QKeySequence("Ctrl+N"), self, self.add_lead)
        QShortcut(QKeySequence("Ctrl+E"), self, self.edit_lead)
        QShortcut(QKeySequence("Delete"), self, self.delete_lead)
        QShortcut(QKeySequence("Ctrl+F"), self, lambda: self.txt_search.setFocus())

    def load_data(self):
        try:
            self.raw_data = self.db.get_all()
            self.populate_filters()
            self.apply_filters()
        except Exception as e:
            QMessageBox.critical(self, "Database Error", f"Error pulling data from Supabase:\n{str(e)}")

    def populate_filters(self):
        self.cmb_country.blockSignals(True)
        self.cmb_sales.blockSignals(True)
        self.cmb_owner.blockSignals(True)

        countries = {item["country"] for item in self.raw_data if item.get("country")}
        sales_persons = {item["sales_person"] for item in self.raw_data if item.get("sales_person")}
        owners = {item["lead_owner"] for item in self.raw_data if item.get("lead_owner")}

        self.cmb_country.clear()
        self.cmb_country.addItem("All Countries")
        self.cmb_country.addItems(sorted(list(countries)))

        self.cmb_sales.clear()
        self.cmb_sales.addItem("All Sales Persons")
        self.cmb_sales.addItems(sorted(list(sales_persons)))

        self.cmb_owner.clear()
        self.cmb_owner.addItem("All Owners")
        self.cmb_owner.addItems(sorted(list(owners)))

        self.cmb_country.blockSignals(False)
        self.cmb_sales.blockSignals(False)
        self.cmb_owner.blockSignals(False)

    def apply_filters(self):
        search_txt = self.txt_search.text().lower().strip()
        status_f = self.cmb_status.currentText()
        country_f = self.cmb_country.currentText()
        sales_f = self.cmb_sales.currentText()
        owner_f = self.cmb_owner.currentText()
        date_scope = self.cmb_date_scope.currentText()
        
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        self.filtered_data = []
        for item in self.raw_data:
            lead_date_str = item.get("lead_date") or ""
            if date_scope == "Last 30 Days Only" and lead_date_str:
                try:
                    ld = date.fromisoformat(lead_date_str)
                    if not (thirty_days_ago <= ld <= today):
                        continue
                except ValueError:
                    continue

            if status_f != "All Statuses" and item.get("lead_status") != status_f: continue
            if country_f != "All Countries" and item.get("country") != country_f: continue
            if sales_f != "All Sales Persons" and item.get("sales_person") != sales_f: continue
            if owner_f != "All Owners" and item.get("lead_owner") != owner_f: continue
            
            if search_txt and not any(search_txt in str(v).lower() for v in item.values() if v is not None): continue

            self.filtered_data.append(item)

        self.refresh_master_table()
        self.refresh_follow_up_table()
        self.update_dashboard()

    def clear_filters(self):
        self.txt_search.clear()
        self.cmb_date_scope.setCurrentIndex(0)
        self.cmb_status.setCurrentIndex(0)
        self.cmb_country.setCurrentIndex(0)
        self.cmb_sales.setCurrentIndex(0)
        self.cmb_owner.setCurrentIndex(0)
        self.apply_filters()

    def refresh_master_table(self):
        self.table.setSortingEnabled(False)
        self.table.setRowCount(0)

        for row_idx, data in enumerate(self.filtered_data):
            self.table.insertRow(row_idx)
            
            date_span_label = format_date_range(data.get("event_start_date"), data.get("event_end_date"))

            row_items = [
                ChronoTableWidgetItem(format_db_to_ui_date(data.get("lead_date")), data.get("lead_date") or ""),
                QTableWidgetItem(data.get("client_name") or ""),
                QTableWidgetItem(data.get("client_email") or ""),
                QTableWidgetItem(data.get("country") or ""),
                QTableWidgetItem(data.get("event_name") or ""),
                ChronoTableWidgetItem(date_span_label, data.get("event_start_date") or ""),
                ChronoTableWidgetItem(format_db_to_ui_date(data.get("follow_up_date")), data.get("follow_up_date") or ""),
                QTableWidgetItem(data.get("sales_person") or ""),
                QTableWidgetItem(data.get("sender_email") or ""),
                QTableWidgetItem(data.get("lead_owner") or ""),
                QTableWidgetItem(data.get("lead_status") or ""),
                QTableWidgetItem(data.get("Remarks") or "")
            ]

            status = data.get("lead_status") or "New Lead"
            text_color = QColor("#2f3640")
            
            if status == "Deal Closed":
                bg_color = QColor("#27ae60")
                text_color = QColor("#ffffff")
            elif status == "Not Interested":
                bg_color = QColor("#c0392b")
                text_color = QColor("#ffffff")
            elif status == "New Lead":
                bg_color = QColor("#ffffff")
                text_color = QColor("#000000")
            elif status == "Interested":
                bg_color = QColor("#d4efdf")
            elif status == "No Response":
                bg_color = QColor("#fdebd0")
            elif status == "Sample Requested":
                bg_color = QColor("#ebdef0")
            else:
                bg_color = QColor("#ffffff")

            for col_idx, item in enumerate(row_items):
                item.setData(Qt.ItemDataRole.UserRole, data.get("id"))
                item.setBackground(bg_color)
                item.setForeground(text_color)
                item.setTextAlignment(Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignLeft)
                self.table.setItem(row_idx, col_idx, item)

        self.table.setSortingEnabled(True)
        self.table.sortByColumn(0, Qt.SortOrder.AscendingOrder)

    def refresh_follow_up_table(self):
        self.follow_up_table.setSortingEnabled(False)
        self.follow_up_table.setRowCount(0)
        today = date.today()
        scope_mode = self.cmb_follow_up_scope.currentText()
        show_time = (scope_mode == "Today's Follow-Ups")

        # Dynamically adjust columns if Today's Follow-Ups is selected
        if show_time:
            self.follow_up_table.setColumnCount(9)
            self.follow_up_table.setHorizontalHeaderLabels([
                "Event Name", "Client Email", "Country", "Event Date Span",
                "Days Remaining", "Schedule Status", "Scheduled Date", "Best Time", "Action"
            ])
        else:
            self.follow_up_table.setColumnCount(8)
            self.follow_up_table.setHorizontalHeaderLabels([
                "Event Name", "Client Email", "Country", "Event Date Span",
                "Days Remaining", "Schedule Status", "Scheduled Date", "Action"
            ])

        row_idx = 0

        mon = today - timedelta(days=today.weekday())
        sun = mon + timedelta(days=6)

        for data in self.raw_data:
            status = data.get("lead_status") or "New Lead"
            if status in ["Deal Closed", "Not Interested"]:
                continue

            follow_date_str = data.get("follow_up_date")
            event_start_str = data.get("event_start_date")
            lead_date_str = data.get("lead_date")
        
            if not follow_date_str or not event_start_str or not lead_date_str:
                continue

            try:
                f_date = date.fromisoformat(follow_date_str)
                e_date = date.fromisoformat(event_start_str)
                l_date = date.fromisoformat(lead_date_str)
                schedule = calculate_follow_ups(l_date, e_date)

                if today.weekday() == 0 and f_date < mon:
                    for index, s_date in enumerate(schedule):
                        if s_date >= mon:
                            f_date = s_date
                            self.db.update(data["id"], {"follow_up_date": f_date.isoformat()})
                            break

                current_step = 7
                for index, s_date in enumerate(schedule):
                    if f_date <= s_date:
                        current_step = index + 1
                        break

                if current_step > 7:
                    continue

                is_match = False
                last_action_str = data.get("last_follow_up_date")
                last_action = None
                if last_action_str:
                    try:
                        last_action = date.fromisoformat(last_action_str)
                    except ValueError:
                        last_action = None
                if scope_mode == "Today's Follow-Ups":
                    if today.weekday() == 4:
                        is_match = (f_date == today) or not (last_action and last_action >= mon)
                    else:
                        is_match = (f_date == today)
                elif scope_mode == "Overdue Follow-Ups":
                    is_match = (f_date < today) and (today <= sun)
                elif scope_mode == "Completed This Week":
                    is_match = bool(last_action and (mon <= last_action <= sun))
                elif scope_mode == "All Follow-Ups":
                    is_match = True

                if is_match:
                    days_remaining = (e_date - today).days
                    self.follow_up_table.insertRow(row_idx)
                    date_span_label = format_date_range(event_start_str, data.get("event_end_date"))
                
                    row_items = [
                        QTableWidgetItem(data.get("event_name") or ""),
                        QTableWidgetItem(data.get("client_email") or ""),
                        QTableWidgetItem(data.get("country") or ""),
                        ChronoTableWidgetItem(date_span_label, event_start_str),
                        QTableWidgetItem(f"{days_remaining} Days"),
                        QTableWidgetItem(f"Follow up {current_step} of 7"),
                        ChronoTableWidgetItem(format_db_to_ui_date(f_date.isoformat()), f_date.isoformat())
                    ]
                
                    if show_time:
                        row_items.append(QTableWidgetItem(data.get("best_time") or "—"))

                    action_col_idx = len(row_items)  

                    for col, item in enumerate(row_items):
                        item.setData(Qt.ItemDataRole.UserRole, data.get("id"))
                        item.setTextAlignment(Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignLeft)
                        self.follow_up_table.setItem(row_idx, col, item)
                
                    if scope_mode == "Completed This Week":
                        lbl_done = QLabel("Completed")
                        lbl_done.setAlignment(Qt.AlignmentFlag.AlignCenter)
                        self.follow_up_table.setCellWidget(row_idx, 7, lbl_done)
                    else:
                        btn_complete = QPushButton("Done")
                        btn_complete.setObjectName("InlineActionBtn")
                        
                        if f_date > today:
                            btn_complete.setText("Scheduled")
                            btn_complete.setEnabled(False)
                            btn_complete.setStyleSheet("background-color: #ced4da !important; color: #6c757d !important; border: none;")
                        else:
                            btn_complete.clicked.connect(
                                lambda checked, r_id=data.get("id"), cur_s=current_step, l_d=l_date, e_d=e_date: 
                                self.complete_follow_up(r_id, cur_s, l_d, e_d)
                            )
                        
                        self.follow_up_table.setCellWidget(row_idx, action_col_idx, btn_complete)

                    row_idx += 1
            except ValueError:
                pass

        self.follow_up_table.setSortingEnabled(True)

    def complete_follow_up(self, record_id, current_step, lead_date, event_date):
        today = date.today()
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)

        if lead_data and lead_data.get("follow_up_date"):
            f_date = date.fromisoformat(lead_data["follow_up_date"])
            if f_date > today:
                QMessageBox.information(
                    self,
                    "Scheduled Follow-Up",
                    f"This task is scheduled for {format_db_to_ui_date(f_date.isoformat())}.\nAction ignored to preserve the upcoming schedule."
                )
                return

        today_iso = today.isoformat()
        schedule = calculate_follow_ups(lead_date, event_date)

        if current_step >= len(schedule):
            self.db.update(record_id, {
                "lead_status": "No Response",
                "follow_up_date": None,
                "last_follow_up_date": today_iso
            })
            QMessageBox.information(self, "Finished", "Sequence complete. Lead status updated to 'No Response'.")
            self.load_data()
            return

        next_date = schedule[current_step].isoformat()
        self.db.update(record_id, {
            "follow_up_date": next_date,
            "last_follow_up_date": today_iso
        })

        QMessageBox.information(self, "Success", f"Next follow-up set for {format_db_to_ui_date(next_date)}")
        self.load_data()

    def update_dashboard(self):
        today = date.today()
        total = len(self.raw_data)
        deals = sum(1 for x in self.raw_data if x.get("lead_status") == "Deal Closed")
        interested = sum(1 for x in self.raw_data if x.get("lead_status") == "Interested")
        
        today_cnt, overdue_cnt = 0, 0
        for x in self.raw_data:
            status = x.get("lead_status") or "New Lead"
            if status in ["Deal Closed", "Not Interested", "No Response"]: continue
            
            f_str = x.get("follow_up_date") or ""
            if f_str:
                try:
                    fd = date.fromisoformat(f_str)
                    if fd == today: today_cnt += 1
                    elif fd < today: overdue_cnt += 1
                except: pass

        self.cards["Total Leads"].setText(str(total))
        self.cards["Deals"].setText(str(deals))
        self.cards["Interested"].setText(str(interested))
        self.cards["Follow Up Today"].setText(str(today_cnt))
        self.cards["Overdue"].setText(str(overdue_cnt))

    def get_selected_db_id(self) -> int:
        selected_indexes = self.table.selectionModel().selectedRows()
        if not selected_indexes: return None
        return self.table.item(selected_indexes[0].row(), 0).data(Qt.ItemDataRole.UserRole)

    def add_lead(self):
        dialog = LeadDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            try:
                self.db.insert(dialog.get_data())
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Insertion Error", f"Could not create database record:\n{str(e)}")

    def edit_lead_from_follow_up(self, item):
        record_id = item.data(Qt.ItemDataRole.UserRole)
        if record_id is None: return
        self.open_edit_dialog_by_id(record_id)

    def edit_lead(self):
        record_id = self.get_selected_db_id()
        if record_id is None:
            QMessageBox.information(self, "Selection Required", "Please select a row.")
            return
        self.open_edit_dialog_by_id(record_id)

    def open_edit_dialog_by_id(self, record_id):
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)
        if not lead_data: return

        dialog = LeadDialog(self, lead_data)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            try:
                self.db.update(record_id, dialog.get_data())
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Update Error", f"Could not sync data changes:\n{str(e)}")

    def delete_lead(self):
        record_id = self.get_selected_db_id()
        if record_id is None: return
        if QMessageBox.question(self, "Confirm Erasure", "Permanently delete lead tracking data?") == QMessageBox.StandardButton.Yes:
            try:
                self.db.delete(record_id)
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Deletion Failure", str(e))

    def show_context_menu(self, pos):
        if self.get_selected_db_id() is None: return
        menu = QMenu(self)
        act_edit = QAction("Edit Lead", self)
        act_delete = QAction("Delete Lead", self)
        act_copy_email = QAction("Copy Client E-mail", self)
        act_copy_name = QAction("Copy Client Identity Name", self)

        act_edit.triggered.connect(self.edit_lead)
        act_delete.triggered.connect(self.delete_lead)
        act_copy_email.triggered.connect(self.copy_email_context)
        act_copy_name.triggered.connect(self.copy_name_context)

        menu.addAction(act_edit)
        menu.addAction(act_delete)
        menu.addSeparator()
        menu.addAction(act_copy_email)
        menu.addAction(act_copy_name)
        menu.exec(self.table.viewport().mapToGlobal(pos))

    def copy_email_context(self):
        row = self.table.selectionModel().selectedRows()[0].row()
        QApplication.clipboard().setText(self.table.item(row, 2).text())

    def copy_name_context(self):
        row = self.table.selectionModel().selectedRows()[0].row()
        QApplication.clipboard().setText(self.table.item(row, 1).text())

    def apply_styles(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #f8f9fa; }
            #CardFrame { background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; }
            #CardTitle { color: #6c757d; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
            #CardValue { color: #212529; font-size: 24px; font-weight: 700; margin-top: 4px; }
            
            QLineEdit, QComboBox, QDateEdit, QTextEdit { 
                border: 1px solid #ced4da; 
                border-radius: 6px; 
                padding: 7px 12px; 
                background-color: #ffffff; 
                color: #495057; 
                font-size: 13px;
            }
            QLineEdit:focus, QComboBox:focus, QDateEdit:focus { border: 1px solid #4dabf7; }
            
            QTabWidget::pane { border: 1px solid #e9ecef; background-color: #ffffff; border-radius: 8px; top: -1px; }
            QTabBar::tab { 
                background: #f1f3f5; 
                color: #495057; 
                padding: 10px 20px; 
                font-weight: 600; 
                border-top-left-radius: 6px; 
                border-top-right-radius: 6px;
                margin-right: 4px;
            }
            QTabBar::tab:selected { background: #ffffff; border: 1px solid #e9ecef; border-bottom-color: #ffffff; color: #228be6; }
            
            QPushButton { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; background-color: #ffffff; border: 1px solid #dee2e6; color: #495057; }
            QPushButton:hover { background-color: #f8f9fa; border-color: #ced4da; }
            #BtnAdd { background-color: #228be6; color: white; border: none; }
            #BtnAdd:hover { background-color: #1c7ed6; }
            #BtnEdit { background-color: #12b886; color: white; border: none; }
            #BtnEdit:hover { background-color: #0ca678; }
            #BtnDelete { background-color: #fa5252; color: white; border: none; }
            #BtnDelete:hover { background-color: #e03131; }
            
            #InlineActionBtn { 
                background-color: #27ae60 !important; 
                color: #ffffff !important; 
                border: none; 
                padding: 3px 10px; 
                border-radius: 4px; 
                font-size: 11px; 
                font-weight: 700; 
                min-height: 22px;
            }
            #InlineActionBtn:hover { background-color: #219653 !important; }

            QTableWidget { background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 6px; gridline-color: #e9ecef; font-size: 13px; }
            QTableWidget::item { padding: 10px; }
            QHeaderView::section { 
                background-color: #f8f9fa; 
                padding: 10px; 
                font-weight: 700; 
                color: #495057; 
                border: none;
                border-bottom: 2px solid #dee2e6;
            }
        """)


class MainWindow(QMainWindow):
    def handle_ai_time_update(self, record_id: int, new_time: str):
        try:
            self.db.update(record_id, {"best_time": new_time})
            QMessageBox.information(self, "CRM Updated", f"Best follow-up time updated to {new_time}")
            self.load_data()
        except Exception as e:
            QMessageBox.critical(self, "Update Error", str(e))

    def toggle_ai_panel(self):
        if self.ai_overlay.isVisible():
            self.ai_overlay.hide()
        else:
            x = (self.width() - self.ai_overlay.width()) // 2
            y = (self.height() - self.ai_overlay.height()) // 2
            self.ai_overlay.move(x, max(20, y))
            self.ai_overlay.show()
            self.ai_overlay.raise_()

    def on_master_lead_selected(self):
        record_id = self.get_selected_db_id()
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)
        self.ai_overlay.set_lead(lead_data)

    def on_followup_lead_selected(self):
        selected_indexes = self.follow_up_table.selectionModel().selectedRows()
        if not selected_indexes:
            return
        record_id = self.follow_up_table.item(selected_indexes[0].row(), 0).data(Qt.ItemDataRole.UserRole)
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)
        self.ai_overlay.set_lead(lead_data)

    def handle_ai_date_update(self, record_id: int, new_date: str):
        try:
            self.db.update(record_id, {"follow_up_date": new_date})
            QMessageBox.information(self, "CRM Updated", f"Follow-up date updated to {new_date}")
            self.load_data()
        except Exception as e:
            QMessageBox.critical(self, "Update Error", str(e))

    def copy_master(self):
        rows = []
        for r in range(self.table.rowCount()):
            rows.append("\t".join(
                self.table.item(r, c).text() if self.table.item(r, c) else ""
                for c in range(self.table.columnCount())
            ))
        QApplication.clipboard().setText("\n".join(rows))

    def handle_master_email_click(self, item):
        if item.column() == 2:  # Column 2 is "Client Email" in Master Table
            email = item.text().strip()
            if email:
                QApplication.clipboard().setText(email)
                self.statusBar().showMessage(f"Copied email: {email}", 3000)

    def handle_followup_email_click(self, item):
        if item.column() == 1:  # Column 1 is "Client Email"
            email = item.text().strip()
            if email:
                QApplication.clipboard().setText(email)
                self.statusBar().showMessage(f"Copied email: {email}", 3000)

    def copy_followup(self):
        rows = []
        for r in range(self.follow_up_table.rowCount()):
            values = []
            for c in range(self.follow_up_table.columnCount()):
                if c == 7:  # Action button
                    values.append("Done")
                else:
                    item = self.follow_up_table.item(r, c)
                    values.append(item.text() if item else "")
            rows.append("\t".join(values))

        QApplication.clipboard().setText("\n".join(rows))

    def __init__(self):
        super().__init__()
        self.setWindowTitle("Team Leads CRM Matrix Suite")
        self.resize(1640, 920)
        self.db = SupabaseManager()
        self.raw_data = []
        self.filtered_data = []
        
        self.setup_ui()
        self.apply_styles()
        self.setup_shortcuts()
        
        if self.db.connect():
            self.load_data()
        else:
            QMessageBox.critical(self, "Connection Error", "Could not connect to Supabase.")

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(10, 8, 10, 8)
        main_layout.setSpacing(6)
        
        dashboard_widget = QWidget()
        dashboard_layout = QHBoxLayout(dashboard_widget)
        self.cards = {}
        metrics = ["Total Leads", "Deals", "Interested", "Follow Up Today", "Overdue"]
        for metric in metrics:
            frame = QFrame()
            frame.setObjectName("CardFrame")
            card_layout = QVBoxLayout(frame)
            card_layout.setContentsMargins(10, 6, 10, 6)
            frame.setMaximumHeight(60)
            title_lbl = QLabel(metric.upper())
            title_lbl.setObjectName("CardTitle")
            title_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            val_lbl = QLabel("0")
            val_lbl.setObjectName("CardValue")
            val_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            card_layout.addWidget(title_lbl)
            card_layout.addWidget(val_lbl)
            dashboard_layout.addWidget(frame)
            self.cards[metric] = val_lbl
        main_layout.addWidget(dashboard_widget)
        dashboard_widget.hide()

        self.tabs = QTabWidget()
        main_layout.addWidget(self.tabs)
        
        # TAB 1: MASTER REGISTRY
        tab1_widget = QWidget()
        tab1_layout = QVBoxLayout(tab1_widget)
        tab1_layout.setContentsMargins(6, 2, 6, 2)
        tab1_layout.setSpacing(4)
        
        filter_panel = QHBoxLayout()
        filter_panel.setSpacing(10)
        
        self.txt_search = QLineEdit()
        self.txt_search.setPlaceholderText("Search any keyword...")
        self.txt_search.textChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.txt_search, 2)
        
        self.cmb_date_scope = QComboBox()
        self.cmb_date_scope.addItems(["Last 30 Days Only", "All Time Records"])
        self.cmb_date_scope.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_date_scope, 1)
        
        self.cmb_status = QComboBox()
        self.cmb_status.addItem("All Statuses")
        self.cmb_status.addItems(["New Lead", "Interested", "Sample Requested", "Deal Closed", "No Response", "Not Interested"])
        self.cmb_status.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_status, 1)

        self.cmb_country = QComboBox()
        self.cmb_country.addItem("All Countries")
        self.cmb_country.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_country, 1)

        self.cmb_sales = QComboBox()
        self.cmb_sales.addItem("All Sales Persons")
        self.cmb_sales.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_sales, 1)

        self.cmb_owner = QComboBox()
        self.cmb_owner.addItem("All Owners")
        self.cmb_owner.currentTextChanged.connect(self.apply_filters)
        filter_panel.addWidget(self.cmb_owner, 1)

        self.btn_clear_filter = QPushButton("Clear Filter")
        self.btn_clear_filter.clicked.connect(self.clear_filters)
        filter_panel.addWidget(self.btn_clear_filter)
        tab1_layout.addLayout(filter_panel)

        action_layout = QHBoxLayout()
        self.btn_add = QPushButton("Add Lead")
        self.btn_edit = QPushButton("Edit")
        self.btn_delete = QPushButton("Delete")
        self.btn_refresh = QPushButton("Refresh")
        self.btn_copy = QPushButton("Copy All")
        self.btn_copy.clicked.connect(self.copy_master)
        
        self.btn_toggle_ai = QPushButton("✦ AI Assistant")
        self.btn_toggle_ai.setStyleSheet("background-color: #8b5cf6; color: white; font-weight: bold;")
        self.btn_toggle_ai.clicked.connect(self.toggle_ai_panel)
        
        self.btn_add.setObjectName("BtnAdd")
        self.btn_edit.setObjectName("BtnEdit")
        self.btn_delete.setObjectName("BtnDelete")
        self.btn_refresh.setObjectName("BtnRefresh")

        self.btn_add.clicked.connect(self.add_lead)
        self.btn_edit.clicked.connect(self.edit_lead)
        self.btn_delete.clicked.connect(self.delete_lead)
        self.btn_refresh.clicked.connect(self.load_data)

        action_layout.addWidget(self.btn_add)
        action_layout.addWidget(self.btn_edit)
        action_layout.addWidget(self.btn_delete)
        action_layout.addWidget(self.btn_toggle_ai)
        action_layout.addStretch()
        action_layout.addWidget(self.btn_copy)
        action_layout.addWidget(self.btn_refresh)
        tab1_layout.addLayout(action_layout)

        self.table = QTableWidget()
        self.table.setColumnCount(12)
        self.table.setHorizontalHeaderLabels([
            "Lead Date", "Client Name", "Client Email", "Country", "Event",
            "Event Dates", "Follow Up", "Sales Person",
            "Sender Email", "Lead Owner", "Status", "Remarks"
        ])
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSortingEnabled(True)
        self.table.setShowGrid(True)
        
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        header.setStretchLastSection(True)
        
        self.table.setColumnWidth(0, 120)
        self.table.setColumnWidth(1, 160)
        self.table.setColumnWidth(2, 220)
        self.table.setColumnWidth(3, 110)
        self.table.setColumnWidth(4, 180)
        self.table.setColumnWidth(5, 130)
        self.table.setColumnWidth(6, 100)
        self.table.setColumnWidth(7, 130)
        self.table.setColumnWidth(8, 160)
        self.table.setColumnWidth(9, 110)
        self.table.setColumnWidth(10, 120)
        
        self.table.itemDoubleClicked.connect(self.edit_lead)
        self.table.itemClicked.connect(self.handle_master_email_click)
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self.show_context_menu)
        self.table.itemSelectionChanged.connect(self.on_master_lead_selected)
        
        tab1_layout.addWidget(self.table, 1)
        self.tabs.addTab(tab1_widget, "Master Leads Registry")

        # TAB 2: FOLLOW UP
        tab2_widget = QWidget()
        tab2_layout = QVBoxLayout(tab2_widget)
        tab2_layout.setContentsMargins(10, 15, 10, 10)
        
        selector_layout = QHBoxLayout()
        selector_layout.addWidget(QLabel("Select Follow-Up Window scope:"))
        self.cmb_follow_up_scope = QComboBox()
        self.cmb_follow_up_scope.addItems(["Today's Follow-Ups", "Overdue Follow-Ups", "Completed This Week", "All Follow-Ups"])
        self.cmb_follow_up_scope.currentTextChanged.connect(self.refresh_follow_up_table)
        selector_layout.addWidget(self.cmb_follow_up_scope, 1)
        
        self.btn_toggle_ai_fu = QPushButton("✦ AI Assistant")
        self.btn_toggle_ai_fu.setStyleSheet("background-color: #8b5cf6; color: white; font-weight: bold;")
        self.btn_toggle_ai_fu.clicked.connect(self.toggle_ai_panel)
        selector_layout.addWidget(self.btn_toggle_ai_fu)

        selector_layout.addStretch(3)
        self.btn_copy_follow = QPushButton("Copy All")
        self.btn_copy_follow.clicked.connect(self.copy_followup)
        selector_layout.addWidget(self.btn_copy_follow)
        tab2_layout.addLayout(selector_layout)
        
        self.follow_up_table = QTableWidget()
        self.follow_up_table.setColumnCount(8)
        self.follow_up_table.setHorizontalHeaderLabels([
            "Event Name", "Client Email", "Country", "Event Date Span", "Days Remaining to Event", "Current Follow Up Schedule Status", "Scheduled Follow Up Date", "Action"
        ])
        self.follow_up_table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.follow_up_table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.follow_up_table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.follow_up_table.setSortingEnabled(True)
        
        self.follow_up_table.itemDoubleClicked.connect(self.edit_lead_from_follow_up)
        self.follow_up_table.itemClicked.connect(self.handle_followup_email_click)
        self.follow_up_table.itemSelectionChanged.connect(self.on_followup_lead_selected)

        fu_header = self.follow_up_table.horizontalHeader()
        fu_header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        fu_header.setStretchLastSection(True)
        self.follow_up_table.setColumnWidth(0, 180)
        self.follow_up_table.setColumnWidth(1, 210)
        self.follow_up_table.setColumnWidth(2, 110)
        self.follow_up_table.setColumnWidth(3, 180)
        self.follow_up_table.setColumnWidth(4, 150)
        self.follow_up_table.setColumnWidth(5, 180)
        self.follow_up_table.setColumnWidth(6, 140)
        
        tab2_layout.addWidget(self.follow_up_table)
        self.tabs.addTab(tab2_widget, "Follow Up")

        # Instantiate Floating Overlay Widget
        self.ai_overlay = AIFollowUpOverlayWidget(self)
        self.ai_overlay.date_updated_signal.connect(self.handle_ai_date_update)
        self.ai_overlay.time_updated_signal.connect(self.handle_ai_time_update)

    def setup_shortcuts(self):
        QShortcut(QKeySequence("Ctrl+N"), self, self.add_lead)
        QShortcut(QKeySequence("Ctrl+E"), self, self.edit_lead)
        QShortcut(QKeySequence("Delete"), self, self.delete_lead)
        QShortcut(QKeySequence("Ctrl+F"), self, lambda: self.txt_search.setFocus())

    def load_data(self):
        try:
            self.raw_data = self.db.get_all()
            self.populate_filters()
            self.apply_filters()
        except Exception as e:
            QMessageBox.critical(self, "Database Error", f"Error pulling data from Supabase:\n{str(e)}")

    def populate_filters(self):
        self.cmb_country.blockSignals(True)
        self.cmb_sales.blockSignals(True)
        self.cmb_owner.blockSignals(True)

        countries = {item["country"] for item in self.raw_data if item.get("country")}
        sales_persons = {item["sales_person"] for item in self.raw_data if item.get("sales_person")}
        owners = {item["lead_owner"] for item in self.raw_data if item.get("lead_owner")}

        self.cmb_country.clear()
        self.cmb_country.addItem("All Countries")
        self.cmb_country.addItems(sorted(list(countries)))

        self.cmb_sales.clear()
        self.cmb_sales.addItem("All Sales Persons")
        self.cmb_sales.addItems(sorted(list(sales_persons)))

        self.cmb_owner.clear()
        self.cmb_owner.addItem("All Owners")
        self.cmb_owner.addItems(sorted(list(owners)))

        self.cmb_country.blockSignals(False)
        self.cmb_sales.blockSignals(False)
        self.cmb_owner.blockSignals(False)

    def apply_filters(self):
        search_txt = self.txt_search.text().lower().strip()
        status_f = self.cmb_status.currentText()
        country_f = self.cmb_country.currentText()
        sales_f = self.cmb_sales.currentText()
        owner_f = self.cmb_owner.currentText()
        date_scope = self.cmb_date_scope.currentText()
        
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        self.filtered_data = []
        for item in self.raw_data:
            lead_date_str = item.get("lead_date") or ""
            if date_scope == "Last 30 Days Only" and lead_date_str:
                try:
                    ld = date.fromisoformat(lead_date_str)
                    if not (thirty_days_ago <= ld <= today):
                        continue
                except ValueError:
                    continue

            if status_f != "All Statuses" and item.get("lead_status") != status_f: continue
            if country_f != "All Countries" and item.get("country") != country_f: continue
            if sales_f != "All Sales Persons" and item.get("sales_person") != sales_f: continue
            if owner_f != "All Owners" and item.get("lead_owner") != owner_f: continue
            
            if search_txt and not any(search_txt in str(v).lower() for v in item.values() if v is not None): continue

            self.filtered_data.append(item)

        self.refresh_master_table()
        self.refresh_follow_up_table()
        self.update_dashboard()

    def clear_filters(self):
        self.txt_search.clear()
        self.cmb_date_scope.setCurrentIndex(0)
        self.cmb_status.setCurrentIndex(0)
        self.cmb_country.setCurrentIndex(0)
        self.cmb_sales.setCurrentIndex(0)
        self.cmb_owner.setCurrentIndex(0)
        self.apply_filters()

    def refresh_master_table(self):
        self.table.setSortingEnabled(False)
        self.table.setRowCount(0)

        for row_idx, data in enumerate(self.filtered_data):
            self.table.insertRow(row_idx)
            
            date_span_label = format_date_range(data.get("event_start_date"), data.get("event_end_date"))

            row_items = [
                ChronoTableWidgetItem(format_db_to_ui_date(data.get("lead_date")), data.get("lead_date") or ""),
                QTableWidgetItem(data.get("client_name") or ""),
                QTableWidgetItem(data.get("client_email") or ""),
                QTableWidgetItem(data.get("country") or ""),
                QTableWidgetItem(data.get("event_name") or ""),
                ChronoTableWidgetItem(date_span_label, data.get("event_start_date") or ""),
                ChronoTableWidgetItem(format_db_to_ui_date(data.get("follow_up_date")), data.get("follow_up_date") or ""),
                QTableWidgetItem(data.get("sales_person") or ""),
                QTableWidgetItem(data.get("sender_email") or ""),
                QTableWidgetItem(data.get("lead_owner") or ""),
                QTableWidgetItem(data.get("lead_status") or ""),
                QTableWidgetItem(data.get("Remarks") or "")
            ]

            status = data.get("lead_status") or "New Lead"
            text_color = QColor("#2f3640")
            
            if status == "Deal Closed":
                bg_color = QColor("#27ae60")
                text_color = QColor("#ffffff")
            elif status == "Not Interested":
                bg_color = QColor("#c0392b")
                text_color = QColor("#ffffff")
            elif status == "New Lead":
                bg_color = QColor("#ffffff")
                text_color = QColor("#000000")
            elif status == "Interested":
                bg_color = QColor("#d4efdf")
            elif status == "No Response":
                bg_color = QColor("#fdebd0")
            elif status == "Sample Requested":
                bg_color = QColor("#ebdef0")
            else:
                bg_color = QColor("#ffffff")

            for col_idx, item in enumerate(row_items):
                item.setData(Qt.ItemDataRole.UserRole, data.get("id"))
                item.setBackground(bg_color)
                item.setForeground(text_color)
                item.setTextAlignment(Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignLeft)
                self.table.setItem(row_idx, col_idx, item)

        self.table.setSortingEnabled(True)
        self.table.sortByColumn(0, Qt.SortOrder.AscendingOrder)

    def refresh_follow_up_table(self):
        self.follow_up_table.setSortingEnabled(False)
        self.follow_up_table.setRowCount(0)
        today = date.today()
        scope_mode = self.cmb_follow_up_scope.currentText()
        show_time = (scope_mode == "Today's Follow-Ups")

        # Dynamically adjust columns if Today's Follow-Ups is selected
        if show_time:
            self.follow_up_table.setColumnCount(9)
            self.follow_up_table.setHorizontalHeaderLabels([
                "Event Name", "Client Email", "Country", "Event Date Span",
                "Days Remaining", "Schedule Status", "Scheduled Date", "Best Time", "Action"
            ])
        else:
            self.follow_up_table.setColumnCount(8)
            self.follow_up_table.setHorizontalHeaderLabels([
                "Event Name", "Client Email", "Country", "Event Date Span",
                "Days Remaining", "Schedule Status", "Scheduled Date", "Action"
            ])

        row_idx = 0

        mon = today - timedelta(days=today.weekday())
        sun = mon + timedelta(days=6)

        for data in self.raw_data:
            status = data.get("lead_status") or "New Lead"
            if status in ["Deal Closed", "Not Interested"]:
                continue

            follow_date_str = data.get("follow_up_date")
            event_start_str = data.get("event_start_date")
            lead_date_str = data.get("lead_date")
        
            if not follow_date_str or not event_start_str or not lead_date_str:
                continue

            try:
                f_date = date.fromisoformat(follow_date_str)
                e_date = date.fromisoformat(event_start_str)
                l_date = date.fromisoformat(lead_date_str)
                schedule = calculate_follow_ups(l_date, e_date)

                if today.weekday() == 0 and f_date < mon:
                    for index, s_date in enumerate(schedule):
                        if s_date >= mon:
                            f_date = s_date
                            self.db.update(data["id"], {"follow_up_date": f_date.isoformat()})
                            break

                current_step = 7
                for index, s_date in enumerate(schedule):
                    if f_date <= s_date:
                        current_step = index + 1
                        break

                if current_step > 7:
                    continue

                is_match = False
                last_action_str = data.get("last_follow_up_date")
                last_action = None
                if last_action_str:
                    try:
                        last_action = date.fromisoformat(last_action_str)
                    except ValueError:
                        last_action = None
                if scope_mode == "Today's Follow-Ups":
                    if today.weekday() == 4:
                        is_match = (f_date == today) or not (last_action and last_action >= mon)
                    else:
                        is_match = (f_date == today)
                elif scope_mode == "Overdue Follow-Ups":
                    is_match = (f_date < today) and (today <= sun)
                elif scope_mode == "Completed This Week":
                    is_match = bool(last_action and (mon <= last_action <= sun))
                elif scope_mode == "All Follow-Ups":
                    is_match = True

                if is_match:
                    days_remaining = (e_date - today).days
                    self.follow_up_table.insertRow(row_idx)
                    date_span_label = format_date_range(event_start_str, data.get("event_end_date"))
                
                    row_items = [
                        QTableWidgetItem(data.get("event_name") or ""),
                        QTableWidgetItem(data.get("client_email") or ""),
                        QTableWidgetItem(data.get("country") or ""),
                        ChronoTableWidgetItem(date_span_label, event_start_str),
                        QTableWidgetItem(f"{days_remaining} Days"),
                        QTableWidgetItem(f"Follow up {current_step} of 7"),
                        ChronoTableWidgetItem(format_db_to_ui_date(f_date.isoformat()), f_date.isoformat())
                    ]
                
                    if show_time:
                        row_items.append(QTableWidgetItem(data.get("best_time") or "—"))

                    action_col_idx = len(row_items)  

                    for col, item in enumerate(row_items):
                        item.setData(Qt.ItemDataRole.UserRole, data.get("id"))
                        item.setTextAlignment(Qt.AlignmentFlag.AlignVCenter | Qt.AlignmentFlag.AlignLeft)
                        self.follow_up_table.setItem(row_idx, col, item)
                
                    if scope_mode == "Completed This Week":
                        lbl_done = QLabel("Completed")
                        lbl_done.setAlignment(Qt.AlignmentFlag.AlignCenter)
                        self.follow_up_table.setCellWidget(row_idx, 7, lbl_done)
                    else:
                        btn_complete = QPushButton("Done")
                        btn_complete.setObjectName("InlineActionBtn")
                        
                        if f_date > today:
                            btn_complete.setText("Scheduled")
                            btn_complete.setEnabled(False)
                            btn_complete.setStyleSheet("background-color: #ced4da !important; color: #6c757d !important; border: none;")
                        else:
                            btn_complete.clicked.connect(
                                lambda checked, r_id=data.get("id"), cur_s=current_step, l_d=l_date, e_d=e_date: 
                                self.complete_follow_up(r_id, cur_s, l_d, e_d)
                            )
                        
                        self.follow_up_table.setCellWidget(row_idx, action_col_idx, btn_complete)

                    row_idx += 1
            except ValueError:
                pass

        self.follow_up_table.setSortingEnabled(True)

    def complete_follow_up(self, record_id, current_step, lead_date, event_date):
        today = date.today()
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)

        if lead_data and lead_data.get("follow_up_date"):
            f_date = date.fromisoformat(lead_data["follow_up_date"])
            if f_date > today:
                QMessageBox.information(
                    self,
                    "Scheduled Follow-Up",
                    f"This task is scheduled for {format_db_to_ui_date(f_date.isoformat())}.\nAction ignored to preserve the upcoming schedule."
                )
                return

        today_iso = today.isoformat()
        schedule = calculate_follow_ups(lead_date, event_date)

        if current_step >= len(schedule):
            self.db.update(record_id, {
                "lead_status": "No Response",
                "follow_up_date": None,
                "last_follow_up_date": today_iso
            })
            QMessageBox.information(self, "Finished", "Sequence complete. Lead status updated to 'No Response'.")
            self.load_data()
            return

        next_date = schedule[current_step].isoformat()
        self.db.update(record_id, {
            "follow_up_date": next_date,
            "last_follow_up_date": today_iso
        })

        QMessageBox.information(self, "Success", f"Next follow-up set for {format_db_to_ui_date(next_date)}")
        self.load_data()

    def update_dashboard(self):
        today = date.today()
        total = len(self.raw_data)
        deals = sum(1 for x in self.raw_data if x.get("lead_status") == "Deal Closed")
        interested = sum(1 for x in self.raw_data if x.get("lead_status") == "Interested")
        
        today_cnt, overdue_cnt = 0, 0
        for x in self.raw_data:
            status = x.get("lead_status") or "New Lead"
            if status in ["Deal Closed", "Not Interested", "No Response"]: continue
            
            f_str = x.get("follow_up_date") or ""
            if f_str:
                try:
                    fd = date.fromisoformat(f_str)
                    if fd == today: today_cnt += 1
                    elif fd < today: overdue_cnt += 1
                except: pass

        self.cards["Total Leads"].setText(str(total))
        self.cards["Deals"].setText(str(deals))
        self.cards["Interested"].setText(str(interested))
        self.cards["Follow Up Today"].setText(str(today_cnt))
        self.cards["Overdue"].setText(str(overdue_cnt))

    def get_selected_db_id(self) -> int:
        selected_indexes = self.table.selectionModel().selectedRows()
        if not selected_indexes: return None
        return self.table.item(selected_indexes[0].row(), 0).data(Qt.ItemDataRole.UserRole)

    def add_lead(self):
        dialog = LeadDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            try:
                self.db.insert(dialog.get_data())
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Insertion Error", f"Could not create database record:\n{str(e)}")

    def edit_lead_from_follow_up(self, item):
        record_id = item.data(Qt.ItemDataRole.UserRole)
        if record_id is None: return
        self.open_edit_dialog_by_id(record_id)

    def edit_lead(self):
        record_id = self.get_selected_db_id()
        if record_id is None:
            QMessageBox.information(self, "Selection Required", "Please select a row.")
            return
        self.open_edit_dialog_by_id(record_id)

    def open_edit_dialog_by_id(self, record_id):
        lead_data = next((x for x in self.raw_data if x.get("id") == record_id), None)
        if not lead_data: return

        dialog = LeadDialog(self, lead_data)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            try:
                self.db.update(record_id, dialog.get_data())
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Update Error", f"Could not sync data changes:\n{str(e)}")

    def delete_lead(self):
        record_id = self.get_selected_db_id()
        if record_id is None: return
        if QMessageBox.question(self, "Confirm Erasure", "Permanently delete lead tracking data?") == QMessageBox.StandardButton.Yes:
            try:
                self.db.delete(record_id)
                self.load_data()
            except Exception as e:
                QMessageBox.critical(self, "Deletion Failure", str(e))

    def show_context_menu(self, pos):
        if self.get_selected_db_id() is None: return
        menu = QMenu(self)
        act_edit = QAction("Edit Lead", self)
        act_delete = QAction("Delete Lead", self)
        act_copy_email = QAction("Copy Client E-mail", self)
        act_copy_name = QAction("Copy Client Identity Name", self)

        act_edit.triggered.connect(self.edit_lead)
        act_delete.triggered.connect(self.delete_lead)
        act_copy_email.triggered.connect(self.copy_email_context)
        act_copy_name.triggered.connect(self.copy_name_context)

        menu.addAction(act_edit)
        menu.addAction(act_delete)
        menu.addSeparator()
        menu.addAction(act_copy_email)
        menu.addAction(act_copy_name)
        menu.exec(self.table.viewport().mapToGlobal(pos))

    def copy_email_context(self):
        row = self.table.selectionModel().selectedRows()[0].row()
        QApplication.clipboard().setText(self.table.item(row, 2).text())

    def copy_name_context(self):
        row = self.table.selectionModel().selectedRows()[0].row()
        QApplication.clipboard().setText(self.table.item(row, 1).text())

    def apply_styles(self):
        self.setStyleSheet("""
            QMainWindow { background-color: #f8f9fa; }
            #CardFrame { background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 12px; }
            #CardTitle { color: #6c757d; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
            #CardValue { color: #212529; font-size: 24px; font-weight: 700; margin-top: 4px; }
            
            QLineEdit, QComboBox, QDateEdit, QTextEdit { 
                border: 1px solid #ced4da; 
                border-radius: 6px; 
                padding: 7px 12px; 
                background-color: #ffffff; 
                color: #495057; 
                font-size: 13px;
            }
            QLineEdit:focus, QComboBox:focus, QDateEdit:focus { border: 1px solid #4dabf7; }
            
            QTabWidget::pane { border: 1px solid #e9ecef; background-color: #ffffff; border-radius: 8px; top: -1px; }
            QTabBar::tab { 
                background: #f1f3f5; 
                color: #495057; 
                padding: 10px 20px; 
                font-weight: 600; 
                border-top-left-radius: 6px; 
                border-top-right-radius: 6px;
                margin-right: 4px;
            }
            QTabBar::tab:selected { background: #ffffff; border: 1px solid #e9ecef; border-bottom-color: #ffffff; color: #228be6; }
            
            QPushButton { padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px; background-color: #ffffff; border: 1px solid #dee2e6; color: #495057; }
            QPushButton:hover { background-color: #f8f9fa; border-color: #ced4da; }
            #BtnAdd { background-color: #228be6; color: white; border: none; }
            #BtnAdd:hover { background-color: #1c7ed6; }
            #BtnEdit { background-color: #12b886; color: white; border: none; }
            #BtnEdit:hover { background-color: #0ca678; }
            #BtnDelete { background-color: #fa5252; color: white; border: none; }
            #BtnDelete:hover { background-color: #e03131; }
            
            #InlineActionBtn { 
                background-color: #27ae60 !important; 
                color: #ffffff !important; 
                border: none; 
                padding: 3px 10px; 
                border-radius: 4px; 
                font-size: 11px; 
                font-weight: 700; 
                min-height: 22px;
            }
            #InlineActionBtn:hover { background-color: #219653 !important; }

            QTableWidget { background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 6px; gridline-color: #e9ecef; font-size: 13px; }
            QTableWidget::item { padding: 10px; }
            QHeaderView::section { 
                background-color: #f8f9fa; 
                padding: 10px; 
                font-weight: 700; 
                color: #495057; 
                border: none;
                border-bottom: 2px solid #dee2e6;
            }
        """)