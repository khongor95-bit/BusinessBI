Attribute VB_Name = "TsalinMail"
' ============================================================
' BusinessBI - Payslip mailer v1 (businessbi.mn)
'   TsSendTest : send the first enabled employee's payslip to the test address only
'   TsSendAll  : send every enabled employee their own payslip (PDF attachment)
'   TsSavePdf  : only save the PDFs to a folder (no e-mail)
' Settings live on the settings sheet as named ranges (BBI_*). This module is
' ASCII-only on purpose, so it imports correctly on any Windows language setting.
' Works with Outlook (installed desktop Outlook) or Gmail SMTP (App password).
' ============================================================
Option Explicit

Private Const COL_NO As Long = 1
Private Const COL_NAME As Long = 2
Private Const COL_MAIL As Long = 3
Private Const COL_SUBJ As Long = 5
Private Const COL_SEND As Long = 6
Private Const COL_STAT As Long = 7
Private Const COL_TIME As Long = 8
Private Const COL_BODY As Long = 9

Private gPass As String

Private Function NV(nm As String) As String
    On Error Resume Next
    NV = CStr(ThisWorkbook.Names(nm).RefersToRange.Value)
End Function

Private Function PdfFolder() As String
    Dim p As String
    p = Environ$("TEMP") & "\BBI_Payslips_" & Format$(Now, "yyyymmdd_hhnnss")
    If Len(Dir$(p, vbDirectory)) = 0 Then MkDir p
    PdfFolder = p
End Function

' Export the payslip of employee #idx to PDF and return the file path
Private Function ExportSlip(idx As Long, folder As String) As String
    Dim sel As Range, slip As Range, f As String
    Set sel = ThisWorkbook.Names("BBI_SlipSel").RefersToRange
    Set slip = ThisWorkbook.Names("BBI_Slip").RefersToRange
    sel.Value = idx
    Application.Calculate
    f = folder & "\Payslip_" & Format$(idx, "000") & ".pdf"
    slip.Worksheet.PageSetup.PrintArea = slip.Address
    slip.Worksheet.ExportAsFixedFormat Type:=0, Filename:=f, Quality:=0, _
        IncludeDocProperties:=False, IgnorePrintAreas:=False, OpenAfterPublish:=False
    ExportSlip = f
End Function

' ---------- RFC 2047 (UTF-8, base64) header encoding for Gmail ----------
Private Function Utf8Bytes(ByVal s As String) As Byte()
    Dim st As Object, b() As Byte
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2: st.Charset = "utf-8": st.Open
    st.WriteText s
    st.Position = 0: st.Type = 1: st.Position = 3   ' skip BOM
    b = st.Read
    st.Close
    Utf8Bytes = b
End Function

Private Function B64(b() As Byte) As String
    Dim d As Object, e As Object
    Set d = CreateObject("MSXML2.DOMDocument")
    Set e = d.createElement("b")
    e.DataType = "bin.base64"
    e.nodeTypedValue = b
    B64 = Replace(Replace(e.Text, vbLf, ""), vbCr, "")
End Function

Private Function IsAscii(ByVal s As String) As Boolean
    Dim i As Long
    For i = 1 To Len(s)
        If AscW(Mid$(s, i, 1)) > 126 Or AscW(Mid$(s, i, 1)) < 0 Then Exit Function
    Next
    IsAscii = True
End Function

' Split into encoded-words of <= 45 UTF-8 bytes without breaking a character
Private Function EncHeader(ByVal s As String) As String
    If IsAscii(s) Then EncHeader = s: Exit Function
    Dim i As Long, ch As String, chunk As String, n As Long, c As Long, w As Long, out As String
    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        c = AscW(ch) And &HFFFF&
        If c < &H80 Then
            w = 1
        ElseIf c < &H800 Then
            w = 2
        Else
            w = 3
        End If
        If n + w > 45 Then
            out = out & IIf(Len(out) > 0, vbCrLf & " ", "") & "=?UTF-8?B?" & B64(Utf8Bytes(chunk)) & "?="
            chunk = "": n = 0
        End If
        chunk = chunk & ch: n = n + w
    Next
    If Len(chunk) > 0 Then out = out & IIf(Len(out) > 0, vbCrLf & " ", "") & "=?UTF-8?B?" & B64(Utf8Bytes(chunk)) & "?="
    EncHeader = out
End Function

' ---------- senders ----------
Private Sub SendOutlook(toAddr As String, subj As String, body As String, att As String)
    Dim ol As Object, m As Object
    Set ol = CreateObject("Outlook.Application")
    Set m = ol.CreateItem(0)
    m.To = toAddr
    m.Subject = subj
    m.Body = body
    m.Attachments.Add att
    If NV("BBI_Display") = "1" Then m.Display Else m.Send
End Sub

Private Sub SendGmail(toAddr As String, subj As String, body As String, att As String)
    Dim msg As Object, sch As String, usr As String
    usr = NV("BBI_GmailUser")
    If Len(gPass) = 0 Then gPass = NV("BBI_GmailPass")
    If Len(gPass) = 0 Then gPass = InputBox(NV("BBI_MsgPass"), "Gmail")
    If Len(gPass) = 0 Then Err.Raise vbObjectError + 1, , "no password"
    sch = "http://schemas.microsoft.com/cdo/configuration/"
    Set msg = CreateObject("CDO.Message")
    With msg.Configuration.Fields
        .Item(sch & "sendusing") = 2
        .Item(sch & "smtpserver") = "smtp.gmail.com"
        .Item(sch & "smtpserverport") = 465
        .Item(sch & "smtpauthenticate") = 1
        .Item(sch & "sendusername") = usr
        .Item(sch & "sendpassword") = gPass
        .Item(sch & "smtpusessl") = True
        .Item(sch & "smtpconnectiontimeout") = 30
        .Update
    End With
    msg.From = EncHeader(NV("BBI_FromName")) & " <" & usr & ">"
    msg.To = toAddr
    msg.Subject = EncHeader(subj)
    msg.BodyPart.Charset = "utf-8"
    msg.TextBody = body
    msg.TextBodyPart.Charset = "utf-8"
    msg.AddAttachment att
    msg.Send
End Sub

Private Sub SendOne(toAddr As String, subj As String, body As String, att As String)
    If LCase$(NV("BBI_Mode")) = "gmail" Then
        SendGmail toAddr, subj, body, att
    Else
        SendOutlook toAddr, subj, body, att
    End If
End Sub

' ---------- core loop ----------
Private Function DoRun(mode As String) As String
    ' mode: "all" | "test" | "pdf"
    Dim t As Range, r As Long, folder As String, okN As Long, errN As Long, total As Long
    Dim addr As String, f As String, sel As Range, keep As Variant
    Set t = ThisWorkbook.Names("BBI_MailTable").RefersToRange
    Set sel = ThisWorkbook.Names("BBI_SlipSel").RefersToRange
    keep = sel.Value
    For r = 1 To t.Rows.Count
        If Len(CStr(t.Cells(r, COL_NAME).Value)) > 0 And CStr(t.Cells(r, COL_SEND).Value) <> "0" Then
            If mode = "pdf" Or Len(CStr(t.Cells(r, COL_MAIL).Value)) > 0 Then total = total + 1
        End If
    Next
    If total = 0 Then DoRun = "0": Exit Function
    If mode = "all" Then
        If MsgBox(NV("BBI_MsgConfirm") & " " & total, vbYesNo + vbQuestion, "BusinessBI") <> vbYes Then DoRun = "": Exit Function
    End If
    folder = PdfFolder()
    Application.ScreenUpdating = False
    For r = 1 To t.Rows.Count
        If Len(CStr(t.Cells(r, COL_NAME).Value)) > 0 And CStr(t.Cells(r, COL_SEND).Value) <> "0" Then
            addr = Trim$(CStr(t.Cells(r, COL_MAIL).Value))
            If mode = "test" Then addr = Trim$(NV("BBI_TestTo"))
            If mode = "pdf" Or Len(addr) > 0 Then
                On Error GoTo fail
                f = ExportSlip(CLng(t.Cells(r, COL_NO).Value), folder)
                If mode <> "pdf" Then
                    SendOne addr, CStr(t.Cells(r, COL_SUBJ).Value), CStr(t.Cells(r, COL_BODY).Value), f
                    If mode = "all" Then t.Cells(r, COL_STAT).Value = "OK": t.Cells(r, COL_TIME).Value = Now
                End If
                okN = okN + 1
                On Error GoTo 0
                If mode = "test" Then Exit For
            End If
        End If
next_row:
    Next
    sel.Value = keep
    Application.ScreenUpdating = True
    If mode = "pdf" Then
        DoRun = NV("BBI_MsgPdf") & vbCrLf & folder
        Shell "explorer.exe """ & folder & """", vbNormalFocus
    ElseIf mode = "test" Then
        DoRun = NV("BBI_MsgTest") & " " & NV("BBI_TestTo")
    Else
        DoRun = NV("BBI_MsgDone") & " " & okN & IIf(errN > 0, vbCrLf & NV("BBI_MsgErr") & " " & errN, "")
    End If
    Exit Function
fail:
    errN = errN + 1
    If mode = "all" Then t.Cells(r, COL_STAT).Value = "ERR: " & Err.Description: t.Cells(r, COL_TIME).Value = Now
    If mode = "test" Then
        sel.Value = keep: Application.ScreenUpdating = True
        DoRun = "ERR: " & Err.Description
        Exit Function
    End If
    Resume next_row
End Function

Public Sub TsSendTest()
    Dim m As String: m = DoRun("test")
    If Len(m) > 0 Then MsgBox m, vbInformation, "BusinessBI"
End Sub

Public Sub TsSendAll()
    Dim m As String: m = DoRun("all")
    If Len(m) > 0 Then MsgBox m, vbInformation, "BusinessBI"
End Sub

Public Sub TsSavePdf()
    Dim m As String: m = DoRun("pdf")
    If Len(m) > 0 Then MsgBox m, vbInformation, "BusinessBI"
End Sub
